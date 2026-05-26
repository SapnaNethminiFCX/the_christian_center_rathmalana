"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { useRoleRequests } from "@/application/hooks/useRoleRequests";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Tiny router page hit by the "Bible School" link in every role's sidebar.
 *
 * - Has `student` role           → /browse-courses
 * - Has PENDING student request  → /apply/student/pending  (show waiting UI)
 * - Otherwise                    → /apply/student  (apply form)
 */
export default function SchoolRouterPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.session.user);
  const { hasPendingStudent, latestStudent, loading } = useRoleRequests();

  useEffect(() => {
    if (!user || loading) return;

    const hasStudent = user.roles?.includes("student");
    if (hasStudent) {
      // Student clicks Bible School → land on their dashboard (enrolled courses + progress)
      router.replace("/dashboard");
    } else if (latestStudent?.status === "approved") {
      // Approved but Redux roles not refreshed yet — send to pending page
      // which handles token refresh + setUser + redirect to browse-courses.
      router.replace(`/apply/student/pending?req=${latestStudent.id}`);
    } else if (hasPendingStudent && latestStudent) {
      router.replace(`/apply/student/pending?req=${latestStudent.id}`);
    } else {
      router.replace("/apply/student");
    }
  }, [user, loading, hasPendingStudent, latestStudent, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <Spinner size={40} />
    </div>
  );
}
