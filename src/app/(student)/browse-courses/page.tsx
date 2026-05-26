"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CourseCover } from "@/components/ui/CourseCover";
import { Icon } from "@/components/ui/Icon";
import { useCourses } from "@/application/hooks/useCourses";
import { useEnrollments } from "@/application/hooks/useEnrollments";

export default function BrowseCoursesPage() {
  const router = useRouter();
  const { getStatus } = useEnrollments();
  // Students only see published courses (even when an admin happens to be logged in).
  const Q = useCourses({ limit: 24, state: "published" });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Browse Courses</h1>
          <div className="greeting">
            <b style={{ color: "var(--color-primary)" }}>{Q.total}</b> course{Q.total !== 1 ? "s" : ""}{" "}
            available on the platform.
          </div>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="audit-toolbar" style={{ marginBottom: 20 }}>
        <div className="audit-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search courses..."
            value={Q.search}
            onChange={(e) => Q.setSearch(e.target.value)}
          />
          {Q.search && (
            <button
              onClick={() => Q.setSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 0, lineHeight: 1 }}
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: 16, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-body-green)" }}>
        {Q.loading
          ? "Loading…"
          : Q.items.length === 0
            ? "No courses match."
            : `${Q.items.length} course${Q.items.length !== 1 ? "s" : ""} on this page`}
      </div>

      {Q.loading && Q.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-body-green)" }}>
          <Icon name="loader" size={24} style={{ opacity: 0.4 }} />
          <p style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 14 }}>Loading courses…</p>
        </div>
      ) : Q.items.length > 0 ? (
        <>
          <div className="my-grid">
            {Q.items.map((c) => {
              const status = getStatus(c.id);
              return (
                <article
                  key={c.id}
                  className="course-card my-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/browse-courses/${c.id}`)}
                >
                  <CourseCover imageUrl={c.coverImageUrl} title={c.title} alt={c.title} />
                  <div className="body">
                    <div className="meta">
                      <span>
                        <Icon name="layers" size={12} />
                        {c.semesterCount} {c.semesterCount === 1 ? "semester" : "semesters"}
                      </span>
                    </div>
                    <h3>{c.title}</h3>
                    <div style={{ marginTop: "auto" }}>
                      {status === "approved" && <Badge tone="success">Enrolled</Badge>}
                      {status === "pending" && <Badge tone="warning">Pending Approval</Badge>}
                      {status === "available" && <Badge tone="info">Available</Badge>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {(Q.hasNext || Q.hasPrev) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 32 }}>
              <Button size="sm" variant="secondary" icon="chevron-left" disabled={!Q.hasPrev} onClick={Q.prevPage}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" iconAfter="chevron-right" disabled={!Q.hasNext} onClick={Q.nextPage}>
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-body-green)", fontFamily: "var(--font-body)" }}>
          <Icon name="search" size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>No courses found</p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>Try a different search term.</p>
          {Q.search && (
            <button
              onClick={() => Q.setSearch("")}
              style={{ marginTop: 16, background: "none", border: "1px solid var(--color-stroke)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13 }}
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
