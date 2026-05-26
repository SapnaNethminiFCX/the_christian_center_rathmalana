"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/application/hooks/useAppSelector";
import { ModuleTiles } from "@/components/member/ModuleTiles";
import { ModuleTile } from "@/components/member/ModuleTile";
import { RoleBanner } from "@/components/member/RoleBanner";
import { PendingCallout } from "@/components/member/PendingCallout";
import { RoleBadgeStack } from "@/components/user/RoleBadgeStack";
import { useRoleRequests } from "@/application/hooks/useRoleRequests";

export default function MemberHomePage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.session.user);

  const hasStudent = user?.roles?.includes("student") ?? false;
  const isG12 = user?.roles?.includes("g12") ?? false;
  const hasLeader = (user?.roles?.includes("leader") || isG12) ?? false;

  // Real API — pending student role request
  const { hasPendingStudent, latestStudent } = useRoleRequests();
  const pendingStudentRequest = !hasStudent && hasPendingStudent ? latestStudent : null;

  const firstName = user?.firstName ?? "there";

  const onBibleSchool = () => {
    if (hasStudent) {
      router.push("/browse-courses");
    } else if (pendingStudentRequest) {
      router.push(`/apply/student/pending?req=${pendingStudentRequest.id}`);
    } else {
      router.push("/apply/student");
    }
  };

  const onCellGroups = () => {
    if (hasLeader) {
      router.push("/cells");
    } else {
      router.push("/my-cells");
    }
  };

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <header className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: 32, color: "var(--color-primary)", letterSpacing: "-0.01em" }}>
            Welcome to TCCR, {firstName}.
          </h1>
          <RoleBadgeStack roles={user?.roles} />
        </div>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-body-green)" }}>
          Pick a module to get started — or apply to access more.
        </p>
      </header>

      {pendingStudentRequest && (
        <PendingCallout
          body="Your request to become a Student is being reviewed by an admin. You'll get a notification once it's decided."
          linkLabel="See request status"
          linkHref="/my-requests"
        />
      )}

      <ModuleTiles>
        <ModuleTile
          variant="bs"
          label="BIBLE SCHOOL"
          title={hasStudent ? "Continue learning" : "Become a Student"}
          body={
            hasStudent
              ? "Jump back into your enrolled courses, track progress, and pick up where you left off."
              : "Browse our Bible School catalogue and request enrolment to access lessons, materials, and progress tracking."
          }
          glyph="book-open"
          onClick={onBibleSchool}
          pills={
            hasStudent
              ? [{ label: "My Courses", onClick: () => router.push("/my-courses"), icon: "arrow-right" }]
              : [{ label: pendingStudentRequest ? "View request" : "Get started", onClick: onBibleSchool, icon: "arrow-right" }]
          }
        />

        <ModuleTile
          variant="cg"
          label="CELL GROUPS"
          title={isG12 ? "Oversee your network" : hasLeader ? "Lead your cells" : "My Cells"}
          body={
            isG12
              ? "Manage your G12 network — review leader reports, attendance trends, and promote new leaders."
              : hasLeader
              ? "Manage members, file weekly reports, and see attendance trends across your cells."
              : "View the cells you belong to. Leaders post weekly reports and updates here."
          }
          glyph="users"
          onClick={onCellGroups}
          pills={[{
            label: isG12 ? "Open G12 view" : hasLeader ? "Open" : "View my cells",
            onClick: onCellGroups,
            icon: "arrow-right",
          }]}
        />
      </ModuleTiles>

      {!hasStudent && !pendingStudentRequest && (
        <RoleBanner
          title="Want to enrol in a course?"
          body="Becoming a Student gives you full access to course lessons, materials, and progress tracking."
          ctaLabel="Apply to become a Student"
          onCta={() => router.push("/apply/student")}
        />
      )}
    </div>
  );
}
