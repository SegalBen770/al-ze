"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TicketCard } from "@/components/TicketCard";
import type { EnrichedTicket, Taxonomy } from "@/lib/types";
import { cn } from "@/lib/utils";

export function KanbanBoard({
  tickets,
  statuses,
  canDrag,
  showCustomer,
}: {
  tickets: EnrichedTicket[];
  statuses: Taxonomy["statuses"];
  canDrag: boolean;
  showCustomer?: boolean;
}) {
  const changeStatus = useMutation(api.tickets.changeStatus);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeTicket = tickets.find((t) => t._id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const ticketId = e.active.id as Id<"tickets">;
    const overStatusId = e.over?.id as Id<"statuses"> | undefined;
    if (!overStatusId) return;
    const ticket = tickets.find((t) => t._id === ticketId);
    if (!ticket || ticket.statusId === overStatusId) return;
    try {
      await changeStatus({ ticketId, statusId: overStatusId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שינוי הסטטוס נכשל");
    }
  }

  const board = (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {statuses.map((status) => (
        <Column
          key={status._id}
          status={status}
          tickets={tickets.filter((t) => t.statusId === status._id)}
          canDrag={canDrag}
          showCustomer={showCustomer}
        />
      ))}
    </div>
  );

  if (!canDrag) return board;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {board}
      <DragOverlay>
        {activeTicket ? (
          <div className="rotate-2 opacity-90 w-72">
            <TicketCard ticket={activeTicket} showCustomer={showCustomer} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tickets,
  canDrag,
  showCustomer,
}: {
  status: Taxonomy["statuses"][number];
  tickets: EnrichedTicket[];
  canDrag: boolean;
  showCustomer?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status._id });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="font-semibold text-sm">{status.name}</span>
        </div>
        <span className="grid min-w-6 place-items-center rounded-full bg-secondary px-1.5 text-xs font-medium text-muted-foreground">
          {tickets.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2.5 rounded-2xl p-2 transition-colors min-h-32",
          isOver ? "bg-primary/5 ring-2 ring-primary/30" : "bg-secondary/40",
        )}
      >
        {tickets.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground/70">
            אין טיקטים כאן
          </p>
        )}
        {tickets.map((ticket) =>
          canDrag ? (
            <DraggableCard key={ticket._id} ticket={ticket} showCustomer={showCustomer} />
          ) : (
            <TicketCard key={ticket._id} ticket={ticket} showCustomer={showCustomer} />
          ),
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  ticket,
  showCustomer,
}: {
  ticket: EnrichedTicket;
  showCustomer?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket._id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <TicketCard ticket={ticket} showCustomer={showCustomer} />
    </div>
  );
}
