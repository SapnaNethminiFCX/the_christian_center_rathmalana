import { signOut } from "firebase/auth";
import { auth } from "@/infrastructure/firebase/auth";
import { tokenService } from "@/infrastructure/firebase/tokenService";

// API origin resolution. Priority:
//   1. NEXT_PUBLIC_API_BASE_URL  — absolute backend URL (cross-origin fetch).
//      Preferred because it works regardless of how the frontend is hosted
//      (no dependency on Next.js rewrites or nginx routing at the frontend
//      origin). Requires backend CORS allowlist to include the frontend.
//   2. NEXT_PUBLIC_API_PREFIX    — relative path (only works if the same
//      origin proxies /api/v1/* to the backend, e.g. local Next.js dev with
//      the next.config.mjs rewrite).
//   3. Hard-coded fallback       — last resort if env vars are missing or
//      misconfigured at deploy time. Update if the backend domain changes.
export const API_PREFIX =
  process.env.NEXT_PUBLIC_API_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_PREFIX
  ?? "https://cms.api.bethelnet.au/api/v1";
const LOCALE_STORAGE_KEY = "edupath.locale";
const SUPPORTED_LOCALES = new Set(["en", "si", "ta"]);

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, string[]>;
  requestId?: string;
}

export class ApiRequestError extends Error implements ApiError {
  code: string;
  status: number;
  details?: Record<string, string[]>;
  requestId?: string;

  constructor(err: ApiError) {
    super(err.message);
    this.code = err.code;
    this.status = err.status;
    this.details = err.details;
    this.requestId = err.requestId;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  /** Sent as `X-Idempotency-Key` — required for cell-report submits, optional elsewhere. */
  idempotencyKey?: string;
};

/** Read the current locale from localStorage so the header survives SSR boundaries. */
function currentLocale(): string {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY);
    return v && SUPPORTED_LOCALES.has(v) ? v : "en";
  } catch {
    return "en";
  }
}

function isProtectedPath(path: string): boolean {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/my-courses") ||
    path.startsWith("/browse-courses") ||
    path.startsWith("/profile") ||
    path.startsWith("/notifications") ||
    path.startsWith("/home") ||
    path.startsWith("/my-cells") ||
    path.startsWith("/my-requests") ||
    path.startsWith("/cells") ||
    path.startsWith("/leader") ||
    path.startsWith("/g12") ||
    path.startsWith("/admin") ||
    path.startsWith("/super-admin") ||
    path.startsWith("/apply")
  );
}

/**
 * Base API request helper.
 *
 * - Prepends API prefix (`NEXT_PUBLIC_API_PREFIX`, default `/api/v1`).
 * - Attaches `Authorization: Bearer <id-token>` (V2: pulled via tokenService).
 * - Attaches `Accept-Language` from the active locale so backend can render
 *   notifications and emails in the user's preferred language (FR-A-009).
 * - Optional `X-Idempotency-Key` — used by cell-report submission to make
 *   offline retries safe (FR-CR-015 / NFR-AVA-004).
 * - On 401 with a token attached, refreshes once and retries; second 401 →
 *   signs out and (if on a protected path) sends user to /login.
 * - Returns `undefined` on 204; throws `ApiRequestError` on non-2xx.
 */
/**
 * Map of in-flight GET requests, keyed by `path::locale`. When several hooks
 * request the same URL concurrently (e.g. the per-row enrichment fan-out in
 * useAdminEnrollmentQueue making N copies of GET /users/{uid}), they all
 * receive the same Promise instead of triggering N independent requests.
 *
 * Entries are removed as soon as the underlying request settles, so this is a
 * dedup of concurrent traffic — not a response cache. POST/PUT/PATCH/DELETE
 * and any request with an idempotency key bypass this entirely.
 */
const inflightGets = new Map<string, Promise<unknown>>();

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, auth: useAuth = true, headers, idempotencyKey, ...rest } = options;
  const method = (rest.method ?? "GET").toString().toUpperCase();

  // Only dedup plain GETs. Anything that mutates server state or carries an
  // idempotency key needs to actually hit the network every time.
  if (method === "GET" && !idempotencyKey) {
    const key = `${path}::${currentLocale()}`;
    const existing = inflightGets.get(key);
    if (existing) return existing as Promise<T>;

    const promise = executeRequest<T>(
      path,
      { body, useAuth, headers, idempotencyKey, rest },
      {},
    ).finally(() => {
      inflightGets.delete(key);
    });
    inflightGets.set(key, promise);
    return promise;
  }

  return executeRequest<T>(path, { body, useAuth, headers, idempotencyKey, rest }, {});
}

interface ExecuteOptions {
  body: unknown;
  useAuth: boolean;
  headers: HeadersInit | undefined;
  idempotencyKey: string | undefined;
  rest: Omit<RequestInit, "body" | "headers">;
}

interface RetryState {
  /** True after we've forced a Firebase token refresh and retried a 401. */
  authRefreshed?: boolean;
  /** True after we've already backed off and retried a 429 once. */
  rateLimitRetried?: boolean;
}

/**
 * Parse `Retry-After` per RFC 7231. The header is either:
 *   - a number of seconds (most common), or
 *   - an HTTP date (rare).
 * Falls back to 1.5s if missing or unparseable. Caps the wait at 5s so the
 * UI doesn't lock up if the server returns an absurd value.
 */
function parseRetryAfter(value: string | null): number {
  if (!value) return 1500;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 5000);
  }
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.min(Math.max(dateMs - Date.now(), 0), 5000);
  }
  return 1500;
}

async function executeRequest<T>(
  path: string,
  opts: ExecuteOptions,
  retryState: RetryState = {},
): Promise<T> {
  const { body, useAuth, headers, idempotencyKey, rest } = opts;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": currentLocale(),
    ...(headers as Record<string, string> | undefined),
  };

  if (useAuth) {
    const token = retryState.authRefreshed ? await tokenService.refresh() : await tokenService.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    finalHeaders["X-Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${API_PREFIX}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  // 429: bounded backoff + single retry BEFORE consuming the response body.
  // Burst spikes (e.g. dashboard loading many cards at once) settle within a
  // second; one quiet retry keeps the user from seeing a "Too many requests"
  // toast for transient overage. Sustained overage still surfaces because
  // we don't loop forever — at most one retry per request.
  if (res.status === 429 && !retryState.rateLimitRetried) {
    const waitMs = parseRetryAfter(res.headers.get("Retry-After"));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return executeRequest<T>(path, opts, { ...retryState, rateLimitRetried: true });
  }

  const json = (await res.json().catch(() => ({}))) as
    | { error?: { code?: string; message?: string; details?: Record<string, string[]> }; requestId?: string }
    | T;

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: Record<string, string[]> }; requestId?: string }).error;

    // 401: token may have just expired between cache hits — try once with a
    // forced refresh before giving up. Second failure means the session is
    // genuinely revoked (suspended account, server-side logout, etc.).
    if (res.status === 401 && useAuth && !retryState.authRefreshed) {
      return executeRequest<T>(path, opts, { ...retryState, authRefreshed: true });
    }

    if (res.status === 401) {
      signOut(auth).catch(() => null);
      tokenService.clear();
      if (typeof window !== "undefined" && isProtectedPath(window.location.pathname)) {
        window.location.href = "/login?reason=expired";
      }
    }

    throw new ApiRequestError({
      code: err?.code ?? "UNKNOWN_ERROR",
      message: err?.message ?? `Request failed with status ${res.status}`,
      status: res.status,
      details: err?.details,
      requestId: (json as { requestId?: string }).requestId,
    });
  }

  return json as T;
}
