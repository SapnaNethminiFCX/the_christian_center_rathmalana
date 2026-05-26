import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseApp } from "@/infrastructure/firebase/firebaseConfig";
import { apiRequest } from "@/infrastructure/api/request";

/**
 * Upload a course cover image and persist the resulting URL on the course.
 *
 * Mirrors what the mobile app does: the file goes straight to Firebase Storage
 * (no dedicated backend upload endpoint exists for course covers — there isn't
 * one because Firebase Storage IS the storage layer), then we PATCH the course
 * with the permanent download URL so the backend has the canonical record.
 *
 * The previous (broken) flow PATCHed a `blob:` URL straight in. The blob only
 * existed in the admin's browser session and died on reload.
 */
export async function uploadCourseCover(courseId: string, file: File): Promise<string> {
  // 1. Upload bytes directly to Firebase Storage.
  const storage = getStorage(firebaseApp);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  // Timestamp suffix avoids cache hits when re-uploading the same name.
  const path = `courses/${courseId}/cover-${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const permanentUrl = await getDownloadURL(storageRef);

  // 2. Persist the permanent URL on the course record so it survives reload
  //    and shows up for other users / on mobile.
  await apiRequest(`/courses/${courseId}`, {
    method: "PATCH",
    body: { coverImageUrl: permanentUrl },
  });

  return permanentUrl;
}
