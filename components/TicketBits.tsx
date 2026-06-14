import { Badge } from "@/components/ui/badge";
import type { EnrichedTicket } from "@/lib/types";

export function StatusBadge({ status }: { status: EnrichedTicket["status"] }) {
  if (!status) return <Badge>ללא סטטוס</Badge>;
  return (
    <Badge color={status.color} dot>
      {status.name}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: EnrichedTicket["priority"] }) {
  if (!priority) return null;
  return <Badge color={priority.color}>{priority.name}</Badge>;
}

export function CategoryBadge({ category }: { category: EnrichedTicket["category"] }) {
  if (!category) return null;
  return <Badge color={category.color}>{category.name}</Badge>;
}
