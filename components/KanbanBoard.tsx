"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TicketCard } from "@/components/TicketCard";
import type { EnrichedTicket, Taxonomy } from "@/lib/types";
import { cn } from "@/lib/utils";

const sortKey = (t: EnrichedTicket) => t.position ?? -t.createdAt;

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
  const setPosition = useMutation(api.tickets.setPosition);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeTicket = tickets.find((t) => t._id === activeId) ?? null;
  const inStatus = (sid: string) => tickets.filter((t) => t.statusId === sid);

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const activeIdStr = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId || overId === activeIdStr) return;

    const active = tickets.find((t) => t._id === activeIdStr);
    if (!active) return;

    // לאיזו עמודה (סטטוס) שוחרר.
    let targetStatus: string;
    let overTicketId: string | null = null;
    if (overId.startsWith("col:")) {
      targetStatus = overId.slice(4);
    } else {
      const overTicket = tickets.find((t) => t._id === overId);
      if (!overTicket) return;
      targetStatus = overTicket.statusId;
      overTicketId = overId;
    }

    // הטיקטים בעמודת היעד (ללא הנגרר), בסדר הנוכחי.
    const colItems = tickets.filter(
      (t) => t.statusId === targetStatus && t._id !== activeIdStr,
    );
    let insertIndex = colItems.length;
    if (overTicketId) {
      const idx = colItems.findIndex((t) => t._id === overTicketId);
      insertIndex = idx < 0 ? colItems.length : idx;
    }

    // מיקום חדש לפי השכנים (אינדוקס חלקי).
    const above = colItems[insertIndex - 1];
    const below = colItems[insertIndex];
    let pos: number;
    if (!above && !below) pos = sortKey(active);
    else if (!above) pos = sortKey(below) - 1_000_000;
    else if (!below) pos = sortKey(above) + 1_000_000;
    else pos = (sortKey(above) + sortKey(below)) / 2;

    try {
      if (active.statusId !== targetStatus) {
        await changeStatus({
          ticketId: activeIdStr as Id<"tickets">,
          statusId: targetStatus as Id<"statuses">,
        });
      }
      await setPosition({ ticketId: activeIdStr as Id<"tickets">, position: pos });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שינוי נכשל");
    }
  }

  const board = (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {statuses.map((status) => (
        <Column
          key={status._id}
          status={status}
          items={inStatus(status._id)}
          canDrag={canDrag}
          showCustomer={showCustomer}
        />
      ))}
    </div>
  );

  if (!canDrag) return board;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
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
  items,
  canDrag,
  showCustomer,
}: {
  status: Taxonomy["statuses"][number];
  items: EnrichedTicket[];
  canDrag: boolean;
  showCustomer?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status._id}` });

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
          {items.length}
        </span>
      </div>
      <SortableContext
        items={items.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-1 flex-col gap-2.5 rounded-2xl p-2 transition-colors min-h-32",
            isOver ? "bg-primary/5 ring-2 ring-primary/30" : "bg-secondary/40",
          )}
        >
          {items.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground/70">
              אין טיקטים כאן
            </p>
          )}
          {items.map((ticket) =>
            canDrag ? (
              <SortableCard
                key={ticket._id}
                ticket={ticket}
                showCustomer={showCustomer}
              />
            ) : (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                showCustomer={showCustomer}
              />
            ),
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  ticket,
  showCustomer,
}: {
  ticket: EnrichedTicket;
  showCustomer?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <TicketCard ticket={ticket} showCustomer={showCustomer} />
    </div>
  );
}
