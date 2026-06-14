"use client";

import { MessageCircle, RefreshCw, CalendarClock, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDate, cn } from "@/lib/utils";
import type { TicketDetail } from "@/lib/types";

type TimelineEvent = TicketDetail["timeline"][number];

export function TicketTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-5">
      {events.map((ev, i) => (
        <TimelineRow key={ev._id} event={ev} isLast={i === events.length - 1} />
      ))}
    </ol>
  );
}

function TimelineRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const isMessage = event.kind === "comment" || event.kind === "created";

  return (
    <li className="relative flex gap-3">
      {/* קו מחבר */}
      {!isLast && (
        <span className="absolute top-9 bottom-[-1.5rem] start-[15px] w-px bg-border" />
      )}
      <div
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-white",
          isMessage ? "bg-primary" : "bg-muted-foreground/60",
        )}
      >
        <EventIcon kind={event.kind} />
      </div>

      <div className="flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-semibold">{event.authorName}</span>
          <SystemText event={event} />
          <span className="text-xs text-muted-foreground">
            · {formatDateTime(event.createdAt)}
          </span>
        </div>

        {isMessage && event.body && (
          <div className="mt-1.5 rounded-2xl rounded-tr-sm bg-secondary/60 px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
            {event.body}
          </div>
        )}

        {event.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {event.attachments.map(
              (att) =>
                att.url && (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block size-28 overflow-hidden rounded-xl border border-border hover:opacity-90 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.url}
                      alt="צרופה"
                      className="size-full object-cover"
                    />
                  </a>
                ),
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function EventIcon({ kind }: { kind: TimelineEvent["kind"] }) {
  const cls = "size-4";
  switch (kind) {
    case "status_change":
      return <RefreshCw className={cls} />;
    case "eta_change":
      return <CalendarClock className={cls} />;
    case "created":
      return <Flag className={cls} />;
    default:
      return <MessageCircle className={cls} />;
  }
}

function SystemText({ event }: { event: TimelineEvent }) {
  if (event.kind === "created") {
    return <span className="text-muted-foreground">פתח/ה את הטיקט</span>;
  }
  if (event.kind === "status_change") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        עדכן/ה סטטוס
        {event.fromStatus && (
          <Badge color={event.fromStatus.color}>{event.fromStatus.name}</Badge>
        )}
        <span>←</span>
        {event.toStatus && (
          <Badge color={event.toStatus.color}>{event.toStatus.name}</Badge>
        )}
      </span>
    );
  }
  if (event.kind === "eta_change") {
    return (
      <span className="text-muted-foreground">
        {event.etaAt
          ? `עדכן/ה צפי לסיום: ${formatDate(event.etaAt)}`
          : "הסיר/ה את הצפי"}
      </span>
    );
  }
  return null;
}
