"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { LayoutGrid, List as ListIcon, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TicketList } from "@/components/TicketList";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { BreathingOrb } from "@/components/animations/BreathingOrb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

const ALL = "all";

function Dashboard() {
  const me = useQuery(api.users.current);
  const taxonomy = useQuery(api.taxonomy.list);
  const [customerFilter, setCustomerFilter] = useState<string>(ALL);
  const customers = useQuery(
    api.customers.list,
    me?.isAdmin ? {} : "skip",
  );
  const tickets = useQuery(api.tickets.list, {});

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      if (statusFilter !== ALL && t.statusId !== statusFilter) return false;
      if (categoryFilter !== ALL && t.categoryId !== categoryFilter) return false;
      if (priorityFilter !== ALL && t.priorityId !== priorityFilter) return false;
      if (customerFilter !== ALL && t.customerId !== customerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, priorityFilter, customerFilter, search]);

  const loading = me === undefined || taxonomy === undefined || tickets === undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {me?.isAdmin ? "כל הטיקטים" : "הטיקטים שלך"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {me?.isAdmin
              ? "מבט-על על כל הפניות מכל הלקוחות"
              : "פתחת פנייה? אני על זה. עקוב אחרי כל שלב כאן."}
          </p>
        </div>
        {me && <CreateTicketDialog me={me} />}
      </div>

      {/* פילטרים + מתג תצוגה */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="ps-9 h-10"
          />
        </div>

        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="סטטוס"
          allLabel="כל הסטטוסים"
          options={taxonomy?.statuses.map((s) => ({ value: s._id, label: s.name })) ?? []}
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="סיווג"
          allLabel="כל הסיווגים"
          options={taxonomy?.categories.map((c) => ({ value: c._id, label: c.name })) ?? []}
        />
        <FilterSelect
          value={priorityFilter}
          onChange={setPriorityFilter}
          placeholder="דחיפות"
          allLabel="כל הדחיפויות"
          options={taxonomy?.priorities.map((p) => ({ value: p._id, label: p.name })) ?? []}
        />
        {me?.isAdmin && (
          <FilterSelect
            value={customerFilter}
            onChange={setCustomerFilter}
            placeholder="לקוח"
            allLabel="כל הלקוחות"
            options={customers?.map((c) => ({ value: c._id, label: c.name })) ?? []}
          />
        )}

        <div className="ms-auto flex items-center rounded-xl border border-border bg-card p-1">
          <ViewButton active={view === "kanban"} onClick={() => setView("kanban")}>
            <LayoutGrid className="size-4" /> לוח
          </ViewButton>
          <ViewButton active={view === "list"} onClick={() => setView("list")}>
            <ListIcon className="size-4" /> רשימה
          </ViewButton>
        </div>
      </div>

      {/* תוכן */}
      {loading ? (
        <div className="grid place-items-center py-24">
          <Spinner className="size-8" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasTickets={(tickets?.length ?? 0) > 0} />
      ) : view === "kanban" ? (
        <KanbanBoard
          tickets={filtered}
          statuses={taxonomy!.statuses}
          canDrag={!!me?.isAdmin}
          showCustomer={!!me?.isAdmin}
        />
      ) : (
        <TicketList tickets={filtered} showCustomer={!!me?.isAdmin} />
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-auto min-w-28 gap-2">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel ?? "הכול"}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ hasTickets }: { hasTickets: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <BreathingOrb size={140} />
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">
          {hasTickets ? "אין תוצאות לסינון הנוכחי" : "הכול רגוע כאן 🌿"}
        </h3>
        <p className="text-muted-foreground max-w-sm">
          {hasTickets
            ? "נסו לשנות את הסינון או החיפוש."
            : "אין עדיין טיקטים. פתח פנייה — ואני כבר על זה."}
        </p>
      </div>
    </div>
  );
}
