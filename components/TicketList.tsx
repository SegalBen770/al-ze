"use client";

import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/TicketBits";
import { formatDate, timeAgo } from "@/lib/utils";
import type { EnrichedTicket } from "@/lib/types";

export function TicketList({
  tickets,
  showCustomer,
}: {
  tickets: EnrichedTicket[];
  showCustomer?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/70 text-right text-xs text-muted-foreground">
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
          {tickets.map((ticket) => (
            <tr
              key={ticket._id}
              onClick={() => router.push(`/tickets/${ticket._id}`)}
              className="border-b border-border/40 last:border-0 cursor-pointer transition-colors hover:bg-secondary/40"
            >
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
