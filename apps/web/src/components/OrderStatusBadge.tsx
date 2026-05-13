import { Badge } from "@mantine/core";

const statusColorMap: Record<string, string> = {
  active: "green",
  paid: "green",
  settled: "green",
  issued: "blue",
  pending_payment: "yellow",
  pending: "yellow",
  draft: "gray",
  trialing: "blue",
  grace: "yellow",
  past_due: "yellow",
  overdue: "red",
  requires_action: "yellow",
  failed: "red",
  chargeback: "red",
  refunded: "gray",
  canceled: "gray",
  expired: "gray",
  suspended: "red",
  void: "gray",
  occupied: "green",
  idle_reclaim_candidate: "yellow",
  revoked: "red",
  rotated: "blue",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge color={statusColorMap[status] ?? "gray"} variant="light">
      {status}
    </Badge>
  );
}
