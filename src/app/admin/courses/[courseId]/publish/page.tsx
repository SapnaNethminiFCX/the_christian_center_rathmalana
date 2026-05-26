"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/application/hooks/useAppDispatch";
import { pushToast } from "@/application/slices/uiSlice";
import { ADMIN_COURSES_SEED } from "@/lib/mock/courses";

export default function PublishCoursePage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const dispatch = useAppDispatch();
  const course = ADMIN_COURSES_SEED.find((c) => c.id === Number(params.courseId));

  const confirm = () => {
    dispatch(
      pushToast({
        tone: "success",
        title: "Course published",
        message: course?.title ?? "Course is now live",
      }),
    );
    setTimeout(() => router.push("/admin/courses"), 600);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Publish course</h1>
          <div className="greeting">Make this course visible to students.</div>
        </div>
      </div>
      <div className="stub-card">
        <div className="stub-ico">
          <Icon name="upload-cloud" size={28} />
        </div>
        <h2>{course?.title ?? "Course"}</h2>
        <p>
          Once published, students can request enrollment. You can unpublish at any time.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button icon="upload-cloud" onClick={confirm}>
            Publish now
          </Button>
        </div>
      </div>
    </div>
  );
}
