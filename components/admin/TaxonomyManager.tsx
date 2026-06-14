"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Taxonomy } from "@/lib/types";

const STATUS_TYPES = [
  { value: "open", label: "נפתח / ממתין" },
  { value: "active", label: "בעבודה (נספר כזמן טיפול)" },
  { value: "done", label: "הושלם / נסגר" },
] as const;

export function TaxonomyManager() {
  const taxonomy = useQuery(api.taxonomy.list);
  if (taxonomy === undefined) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <StatusSection statuses={taxonomy.statuses} />
      <CategorySection categories={taxonomy.categories} />
      <PrioritySection priorities={taxonomy.priorities} />
      <TagSection tags={taxonomy.tags} />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

function ColorDot({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  return (
    <label className="relative shrink-0 cursor-pointer" title="שינוי צבע">
      <span
        className="block size-6 rounded-full border border-border"
        style={{ backgroundColor: color }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  );
}

/* -------------------------------- סטטוסים -------------------------------- */

function StatusSection({ statuses }: { statuses: Taxonomy["statuses"] }) {
  const update = useMutation(api.taxonomy.updateStatus);
  const create = useMutation(api.taxonomy.createStatus);
  const remove = useMutation(api.taxonomy.deleteStatus);
  const [name, setName] = useState("");

  return (
    <Section
      title="סטטוסים"
      description="עמודות הלוח ושלבי הטיפול. הסוג קובע איך נמדד הזמן."
    >
      {statuses.map((s) => (
        <div key={s._id} className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />
          <ColorDot color={s.color} onChange={(color) => update({ id: s._id, color })} />
          <Input
            defaultValue={s.name}
            onBlur={(e) =>
              e.target.value !== s.name && update({ id: s._id, name: e.target.value })
            }
            className="h-9 flex-1"
          />
          <Select
            value={s.type}
            onValueChange={(type) =>
              update({ id: s._id, type: type as "open" | "active" | "done" })
            }
          >
            <SelectTrigger className="h-9 w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DeleteBtn
            onClick={async () => {
              try {
                await remove({ id: s._id });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
              }
            }}
          />
        </div>
      ))}
      <AddRow
        value={name}
        onChange={setName}
        placeholder="סטטוס חדש..."
        onAdd={async () => {
          if (!name.trim()) return;
          await create({ name: name.trim(), color: "#64748b", type: "open" });
          setName("");
        }}
      />
    </Section>
  );
}

/* -------------------------------- סיווגים -------------------------------- */

function CategorySection({ categories }: { categories: Taxonomy["categories"] }) {
  const update = useMutation(api.taxonomy.updateCategory);
  const create = useMutation(api.taxonomy.createCategory);
  const remove = useMutation(api.taxonomy.deleteCategory);
  const [name, setName] = useState("");

  return (
    <Section title="סיווגים" description="סוג הפנייה — שאלה, פיתוח, באג ועוד.">
      {categories.map((c) => (
        <SimpleRow
          key={c._id}
          color={c.color}
          name={c.name}
          onColor={(color) => update({ id: c._id, color })}
          onName={(name) => update({ id: c._id, name })}
          onDelete={() => remove({ id: c._id })}
        />
      ))}
      <AddRow
        value={name}
        onChange={setName}
        placeholder="סיווג חדש..."
        onAdd={async () => {
          if (!name.trim()) return;
          await create({ name: name.trim(), color: "#0ea5e9" });
          setName("");
        }}
      />
    </Section>
  );
}

/* ------------------------------- דחיפויות ------------------------------- */

function PrioritySection({ priorities }: { priorities: Taxonomy["priorities"] }) {
  const update = useMutation(api.taxonomy.updatePriority);
  const create = useMutation(api.taxonomy.createPriority);
  const remove = useMutation(api.taxonomy.deletePriority);
  const [name, setName] = useState("");

  return (
    <Section title="רמות דחיפות" description="נמוכה, רגילה, גבוהה, דחוף...">
      {priorities.map((p) => (
        <SimpleRow
          key={p._id}
          color={p.color}
          name={p.name}
          onColor={(color) => update({ id: p._id, color })}
          onName={(name) => update({ id: p._id, name })}
          onDelete={() => remove({ id: p._id })}
        />
      ))}
      <AddRow
        value={name}
        onChange={setName}
        placeholder="רמת דחיפות חדשה..."
        onAdd={async () => {
          if (!name.trim()) return;
          const level = priorities.length + 1;
          await create({ name: name.trim(), color: "#f59e0b", level });
          setName("");
        }}
      />
    </Section>
  );
}

/* --------------------------------- תגיות --------------------------------- */

function TagSection({ tags }: { tags: Taxonomy["tags"] }) {
  const update = useMutation(api.taxonomy.updateTag);
  const create = useMutation(api.taxonomy.createTag);
  const remove = useMutation(api.taxonomy.deleteTag);
  const [name, setName] = useState("");

  return (
    <Section title="תגיות" description="תגיות חופשיות לסימון נוסף של טיקטים.">
      {tags.length === 0 && (
        <p className="text-xs text-muted-foreground">אין עדיין תגיות.</p>
      )}
      {tags.map((t) => (
        <SimpleRow
          key={t._id}
          color={t.color}
          name={t.name}
          onColor={(color) => update({ id: t._id, color })}
          onName={(name) => update({ id: t._id, name })}
          onDelete={() => remove({ id: t._id })}
        />
      ))}
      <AddRow
        value={name}
        onChange={setName}
        placeholder="תגית חדשה..."
        onAdd={async () => {
          if (!name.trim()) return;
          await create({ name: name.trim(), color: "#8b5cf6" });
          setName("");
        }}
      />
    </Section>
  );
}

/* ------------------------------- רכיבי עזר ------------------------------- */

function SimpleRow({
  color,
  name,
  onColor,
  onName,
  onDelete,
}: {
  color: string;
  name: string;
  onColor: (c: string) => void;
  onName: (n: string) => void;
  onDelete: () => Promise<unknown> | void;
}) {
  return (
    <div className="flex items-center gap-2">
      <ColorDot color={color} onChange={onColor} />
      <Input
        defaultValue={name}
        onBlur={(e) => e.target.value !== name && onName(e.target.value)}
        className="h-9 flex-1"
      />
      <DeleteBtn
        onClick={async () => {
          try {
            await onDelete();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "מחיקה נכשלה");
          }
        }}
      />
    </div>
  );
}

function AddRow({
  value,
  onChange,
  placeholder,
  onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onAdd: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    try {
      await onAdd();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-2 pt-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder={placeholder}
        className="h-9 flex-1"
      />
      <Button size="sm" variant="outline" onClick={add} disabled={busy || !value.trim()}>
        {busy ? <Spinner className="size-4" /> : <Plus className="size-4" />}
        הוספה
      </Button>
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
