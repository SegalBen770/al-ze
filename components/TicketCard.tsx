"use client";

import Link from "next/link";
import { Clock, Paperclip, Building2 } from "lucide-react";
import { PriorityBadge, CategoryBadge } from "@/components/TicketBits";
import { timeAgo, formatDate } from "@/lib/utils";
import type { EnrichedTicket } from "@/lib/types";

export function TicketCard({
  ticket,
  showCustomer,
}: {
  ticket: EnrichedTicket;
  showCustomer?: boolean;
}) {
  return (
    <Link
      href={`/tickets/${ticket._id}`}
      className="block rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug line-clamp-2">{ticket.title}</h3>
      </div>
      {ticket.description && (
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
          {ticket.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={ticket.category} />
        <PriorityBadge priority={ticket.priority} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" />
          {timeAgo(ticket.createdAt)}
        </span>
        <div className="flex items-center gap-2.5">
          {ticket.attachmentIds.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="size-3.5" />
              {ticket.attachmentIds.length}
            </span>
          )}
          {ticket.etaAt && (
            <span className="flex items-center gap-1 text-primary font-medium">
              צפי {formatDate(ticket.etaAt)}
            </span>
          )}
        </div>
      </div>

      {showCustomer && ticket.customerName && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
          <Building2 className="size-3.5" />
          {ticket.customerName}
        </div>
      )}
    </Link>
  );
}
