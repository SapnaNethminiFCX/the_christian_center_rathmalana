/**
 * Local-only store for profile fields that aren't on the API yet.
 *
 * Today this holds the qualifications list (multiple title + optional PDF
 * attachment per entry). The backend will be extended to accept this array;
 * once it does, replace the load/save calls below with `apiRequest` against
 * the new endpoint and delete this module.
 *
 * Fields that DID migrate to the backend (PATCH /me §3.2) and are no longer
 * stored here:
 *   - address
 *   - dateOfBirth
 *   - gender
 *   - qualificationTitle  (the FIRST entry's title is mirrored to this
 *     backend field on save so the apply-student gate still works)
 */

export interface Qualification {
  /** Stable id used as the React key. Generated on add. Per PATCH /me §3.2
   *  this is a client-generated UUID the backend stores verbatim. */
  id: string;
  /** Free-text title — e.g. "Bachelor of Theology", "Diploma in Counselling". */
  title: string;
  /** Backend-returned URL from POST /me/qualification (V2 §3.2). `null`
   *  when no PDF is attached. Locally-selected files that haven't been
   *  uploaded yet keep this null and surface the filename via
   *  `pendingFileName`. */
  fileUrl: string | null;
  /** Locally-selected file's name before upload — UI only, not persisted
   *  on the backend. Cleared once `fileUrl` is set after upload. */
  pendingFileName?: string | null;
}

export interface ProfileExtras {
  qualifications: Qualification[];
}

export const EMPTY_PROFILE_EXTRAS: ProfileExtras = {
  qualifications: [],
};

function keyFor(uid: string): string {
  return `edupath.profileExtras.${uid}`;
}

/** Generate a stable-ish id for new qualifications. */
export function newQualificationId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadProfileExtras(uid: string | null | undefined): ProfileExtras {
  if (!uid || typeof window === "undefined") return EMPTY_PROFILE_EXTRAS;
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return EMPTY_PROFILE_EXTRAS;
    const parsed = JSON.parse(raw) as Partial<ProfileExtras>;
    return {
      ...EMPTY_PROFILE_EXTRAS,
      qualifications: Array.isArray(parsed.qualifications)
        ? parsed.qualifications
            .filter((q): q is Qualification =>
              !!q && typeof q === "object" &&
              typeof (q as Qualification).id === "string" &&
              typeof (q as Qualification).title === "string"
            )
            // Backwards-compat: older entries used `attachmentName` instead
            // of `fileUrl`. Normalise on load so the new shape is consistent.
            .map((q) => {
              const legacy = q as Qualification & { attachmentName?: string | null };
              if (q.fileUrl === undefined && legacy.attachmentName !== undefined) {
                return { id: q.id, title: q.title, fileUrl: null, pendingFileName: legacy.attachmentName };
              }
              return { id: q.id, title: q.title, fileUrl: q.fileUrl ?? null, pendingFileName: q.pendingFileName ?? null };
            })
        : [],
    };
  } catch {
    return EMPTY_PROFILE_EXTRAS;
  }
}

export function saveProfileExtras(uid: string, value: ProfileExtras): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * "Complete enough" for the student-application flow per spec §3.2:
 * dateOfBirth + gender + address + qualificationTitle must all be set on
 * the backend SessionUser.
 */
export function isProfileCoreComplete(user: {
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  qualificationTitle?: string | null;
}): boolean {
  return Boolean(
    user.dateOfBirth && user.dateOfBirth.trim() &&
    user.gender && user.gender.trim() &&
    user.address && user.address.trim() &&
    user.qualificationTitle && user.qualificationTitle.trim(),
  );
}
