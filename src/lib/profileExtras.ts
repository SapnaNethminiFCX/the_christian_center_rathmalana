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
  /** Stable id used as the React key. Generated on add. */
  id: string;
  /** Free-text title — e.g. "Bachelor of Theology", "Diploma in Counselling". */
  title: string;
  /** Filename of the uploaded transcript / certificate (PDF). Optional.
   *  We only persist the filename — file bytes are not stored in
   *  localStorage, so the actual document is gone after refresh. When the
   *  backend gets an upload endpoint, this becomes the storage key / URL. */
  attachmentName: string | null;
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
