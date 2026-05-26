"use client";

import { useState } from "react";
import {
  STUDENT_IN_PROGRESS,
  STUDENT_ENROLLED_NOT_STARTED,
  STUDENT_PENDING_COURSES,
} from "@/lib/mock/courses";

export type EnrollmentStatus = "enrolled" | "pending" | "available";

const ENROLLED_IDS = new Set([
  ...STUDENT_IN_PROGRESS.map((c) => c.id),
  ...STUDENT_ENROLLED_NOT_STARTED.map((c) => c.id),
]);

const INITIAL_PENDING_IDS = new Set(STUDENT_PENDING_COURSES.map((c) => c.id));

export function useEnrollmentRequests() {
  const [pendingIds, setPendingIds] = useState<Set<string>>(INITIAL_PENDING_IDS);

  const getStatus = (courseId: string): EnrollmentStatus => {
    if (ENROLLED_IDS.has(courseId)) return "enrolled";
    if (pendingIds.has(courseId)) return "pending";
    return "available";
  };

  const requestEnrollment = (courseId: string) => {
    setPendingIds((prev) => new Set([...prev, courseId]));
  };

  return { getStatus, requestEnrollment, pendingIds };
}
