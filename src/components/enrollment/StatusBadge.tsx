import { Badge } from "@/components/ui/Badge";

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "pending") return <Badge tone="warning">Pending</Badge>;
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  return <Badge tone="error">Rejected</Badge>;
}
