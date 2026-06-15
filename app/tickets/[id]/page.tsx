"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CalendarClock,
  Hourglass,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppShell } from "@/components/AppShell";
import { TicketTimeline } from "@/components/TicketTimeline";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/TicketBits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ImagePicker } from "@/components/ImagePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadImages } from "@/lib/useFileUpload";
import { formatDate, formatDateTime, formatDuration } from "@/lib/utils";
import type { TicketDetail } from "@/lib/types";

export default function TicketPage() {
  return (
    <AppShell>
      <TicketDetailView />
    </AppShell>
  );
}

function TicketDetailView() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as Id<"tickets">;
  const data = useQuery(api.tickets.getWithMetrics, { ticketId });
  const me = useQuery(api.users.current);

  if (data === undefined || me === undefined) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="size-8" />
      </div>
    );
  }

  const { ticket, timeline, metrics } = data;
  const isAdmin = !!me?.isAdmin;
  const isDone = ticket.status?.type === "done";

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="size-4" />
        חזרה לכל הטיקטים
      </button>

      {/* באנר ביטחון */}
      <ConfidenceBanner isDone={isDone} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* עמודה ראשית */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={ticket.status} />
              <CategoryBadge category={ticket.category} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-2xl font-bold leading-tight">{ticket.title}</h1>
            {isAdmin && ticket.customerName && (
              <p className="text-sm text-muted-foreground mt-1">
                לקוח: {ticket.customerName} · נפתח ע״י {ticket.creatorName}
              </p>
            )}
          </div>

          <Card className="p-5">
            <h2 className="font-semibold mb-4 text-sm text-muted-foreground">
              מהלך הטיפול
            </h2>
            <TicketTimeline events={timeline} />
          </Card>

          <Composer ticketId={ticketId} />
        </div>

        {/* סרגל צד */}
        <div className="space-y-4">
          <MetricsPanel metrics={metrics} ticket={ticket} />
          {isAdmin && <AdminControls ticketId={ticketId} ticket={ticket} />}
        </div>
      </div>
    </div>
  );
}

function ConfidenceBanner({ isDone }: { isDone: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-accent/50 px-5 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        {isDone ? <CheckCircle2 className="size-5" /> : <Sparkles className="size-5" />}
      </span>
      <div>
        <p className="font-semibold text-sm">
          {isDone ? "סיימתי — הייתי על זה ✓" : "קיבלתי, ואני על זה 💪"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isDone
            ? "תודה על הסבלנות. כל הפרטים שמורים כאן."
            : "הפנייה כבר אצלי בטיפול. אפשר להירגע — אעדכן אותך בכל שלב, ממש כאן."}
        </p>
      </div>
    </div>
  );
}

function MetricsPanel({
  metrics,
  ticket,
}: {
  metrics: TicketDetail["metrics"];
  ticket: TicketDetail["ticket"];
}) {
  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-semibold text-sm text-muted-foreground">מעקב זמנים</h2>
      <MetricRow
        icon={<Clock className="size-4" />}
        label="נפתח בתאריך"
        value={formatDateTime(metrics.createdAt)}
      />
      {ticket.etaAt && (
        <MetricRow
          icon={<CalendarClock className="size-4 text-primary" />}
          label="צפי לסיום"
          value={formatDate(ticket.etaAt)}
          highlight
        />
      )}
      {metrics.isClosed ? (
        <>
          <MetricRow
            icon={<CheckCircle2 className="size-4 text-emerald-600" />}
            label="הושלם בתאריך"
            value={metrics.closedAt ? formatDateTime(metrics.closedAt) : "—"}
          />
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
            <p className="text-xs text-emerald-700">הטיפול לקח</p>
            <p className="text-lg font-bold text-emerald-800">
              {formatDuration(metrics.totalMs)}
            </p>
          </div>
        </>
      ) : (
        <MetricRow
          icon={<Hourglass className="size-4" />}
          label="בטיפול כבר"
          value={formatDuration(metrics.totalMs)}
        />
      )}
      <MetricRow
        icon={<Hourglass className="size-4" />}
        label="זמן עבודה בפועל"
        value={metrics.activeMs > 0 ? formatDuration(metrics.activeMs) : "טרם החל"}
        subtle
      />
    </Card>
  );
}

function MetricRow({
  icon,
  label,
  value,
  highlight,
  subtle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={
          highlight
            ? "text-sm font-semibold text-primary"
            : subtle
              ? "text-sm text-muted-foreground"
              : "text-sm font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

function AdminControls({
  ticketId,
  ticket,
}: {
  ticketId: Id<"tickets">;
  ticket: TicketDetail["ticket"];
}) {
  const taxonomy = useQuery(api.taxonomy.list);
  const changeStatus = useMutation(api.tickets.changeStatus);
  const setEta = useMutation(api.tickets.setEta);
  const removeTicket = useMutation(api.tickets.remove);
  const router = useRouter();

  const etaValue = ticket.etaAt
    ? new Date(ticket.etaAt).toISOString().slice(0, 10)
    : "";

  return (
    <Card className="p-5 space-y-4 border-primary/20">
      <h2 className="font-semibold text-sm text-muted-foreground">ניהול (מנהל)</h2>

      <div className="space-y-2">
        <Label>סטטוס</Label>
        <Select
          value={ticket.statusId}
          onValueChange={async (v) => {
            try {
              await changeStatus({ ticketId, statusId: v as Id<"statuses"> });
              toast.success("הסטטוס עודכן");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "שגיאה");
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {taxonomy?.statuses.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="eta">צפי לסיום</Label>
        <input
          id="eta"
          type="date"
          defaultValue={etaValue}
          className="flex h-11 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={async (e) => {
            const val = e.target.value;
            const etaAt = val ? new Date(`${val}T12:00:00`).getTime() : undefined;
            try {
              await setEta({ ticketId, etaAt });
              toast.success(etaAt ? "הצפי עודכן" : "הצפי הוסר");
            } catch {
              toast.error("עדכון הצפי נכשל");
            }
          }}
        />
      </div>

      <div className="pt-3 border-t border-border/60">
        <Button
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={async () => {
            if (
              !confirm("למחוק את הטיקט לצמיתות? כל ההיסטוריה והתמונות יימחקו.")
            )
              return;
            try {
              await removeTicket({ ticketId });
              toast.success("הטיקט נמחק");
              router.push("/");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "המחיקה נכשלה");
            }
          }}
        >
          <Trash2 className="size-4" />
          מחיקת הטיקט
        </Button>
      </div>
    </Card>
  );
}

function Composer({ ticketId }: { ticketId: Id<"tickets"> }) {
  const addComment = useMutation(api.tickets.addComment);
  const uploadImages = useUploadImages();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    try {
      const attachmentIds = files.length ? await uploadImages(files) : [];
      await addComment({ ticketId, body: body.trim(), attachmentIds });
      setBody("");
      setFiles([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחת התגובה נכשלה");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="כתוב תגובה, שאלה או עדכון..."
        rows={3}
      />
      <ImagePicker files={files} onChange={setFiles} />
      <div className="flex justify-start">
        <Button onClick={send} disabled={sending}>
          {sending ? <Spinner className="text-primary-foreground" /> : <Send className="size-4" />}
          שליחה
        </Button>
      </div>
    </Card>
  );
}
