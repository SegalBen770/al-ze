"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Paperclip, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/TicketBits";
import { formatDate, timeAgo } from "@/lib/utils";
import type { EnrichedTicket } from "@/lib/types";

export function TicketList({
  tickets,
  showCustomer,
  canReorder,
}: {
  tickets: EnrichedTicket[];
  showCustomer?: boolean;
  canReorder?: boolean;
}) {
  const router = useRouter();
  const setPosition = useMutation(api.tickets.setPosition);

  // עותק מקומי לסידור חלק; מסונכרן עם השרת.
  const [rows, setRows] = useState(tickets);
  const idsKey = tickets.map((t) => t._id).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRows(tickets), [idsKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const sortKey = (t: EnrichedTicket) => t.position ?? -t.createdAt;

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((t) => t._id === active.id);
    const newIndex = rows.findIndex((t) => t._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(rows, oldIndex, newIndex);
    setRows(next);

    // מיקום חדש = ממוצע השכנים (אינדוקס חלקי), או מעבר לקצה.
    const above = next[newIndex - 1];
    const below = next[newIndex + 1];
    let pos: number;
    if (!above) pos = sortKey(below) - 1_000_000;
    else if (!below) pos = sortKey(above) + 1_000_000;
    else pos = (sortKey(above) + sortKey(below)) / 2;

    setPosition({ ticketId: active.id as Id<"tickets">, position: pos }).catch(
      (err) =>
        toast.error(err instanceof Error ? err.message : "שינוי הסדר נכשל"),
    );
  }

  const table = (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border/70 text-right text-xs text-muted-foreground">
          {canReorder && <th className="w-8" />}
          <th className="px-4 py-3 font-medium">נושא</th>
          <th className="px-4 py-3 font-medium">סטטוס</th>
          <th className="px-4 py-3 font-medium">סיווג</th>
          <th className="px-4 py-3 font-medium">דחיפות</th>
          {showCustomer && <th className="px-4 py-3 font-medium">לקוח</th>}
          <th className="px-4 py-3 font-medium">נפתח</th>
          <th className="px-4 py-3 font-medium">צפי</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((ticket) => (
          <Row
            key={ticket._id}
            ticket={ticket}
            showCustomer={showCustomer}
            canReorder={canReorder}
            onOpen={() => router.push(`/tickets/${ticket._id}`)}
          />
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
      {canReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={rows.map((t) => t._id)}
            strategy={verticalListSortingStrategy}
          >
            {table}
          </SortableContext>
        </DndContext>
      ) : (
        table
      )}
    </div>
  );
}

function Row({
  ticket,
  showCustomer,
  canReorder,
  onOpen,
}: {
  ticket: EnrichedTicket;
  showCustomer?: boolean;
  canReorder?: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket._id, disabled: !canReorder });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={onOpen}
      className="border-b border-border/40 last:border-0 cursor-pointer transition-colors hover:bg-secondary/40"
    >
      {canReorder && (
        <td className="ps-2 w-8">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
            title="גרירה לשינוי סדר"
          >
            <GripVertical className="size-4" />
          </button>
        </td>
      )}
      <td className="px-4 py-3 max-w-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium line-clamp-1">{ticket.title}</span>
          {ticket.attachmentIds.length > 0 && (
            <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-3">
        <CategoryBadge category={ticket.category} />
      </td>
      <td className="px-4 py-3">
        <PriorityBadge priority={ticket.priority} />
      </td>
      {showCustomer && (
        <td className="px-4 py-3 text-muted-foreground">
          {ticket.customerName ?? "—"}
        </td>
      )}
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {timeAgo(ticket.createdAt)}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {ticket.etaAt ? formatDate(ticket.etaAt) : "—"}
      </td>
    </tr>
  );
}
