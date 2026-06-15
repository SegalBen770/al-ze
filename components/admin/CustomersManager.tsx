"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  UserPlus,
  Users,
  Mail,
  X,
  ChevronLeft,
  Pencil,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type UserRow = FunctionReturnType<typeof api.customers.usersForCustomer>[number];

export function CustomersManager() {
  const customers = useQuery(api.customers.list);
  const [selected, setSelected] = useState<Id<"customers"> | null>(null);

  if (customers === undefined) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-5">
      {/* רשימת לקוחות */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">לקוחות</h2>
          <NewCustomerDialog />
        </div>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            אין עדיין לקוחות. צור את הראשון 🙂
          </p>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelected(c._id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-start transition-colors",
                  selected === c._id
                    ? "border-primary/40 bg-accent/40"
                    : "border-border/70 bg-card hover:bg-secondary/40",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
                    <Building2 className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="size-3" />
                      {c.userCount} משתמשים
                      {c.pendingInviteCount > 0 && ` · ${c.pendingInviteCount} ממתינות`}
                    </p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* פאנל לקוח נבחר */}
      <div>
        {selected ? (
          <CustomerDetail customerId={selected} />
        ) : (
          <Card className="grid place-items-center py-20 text-center text-muted-foreground">
            <div className="space-y-2">
              <Building2 className="size-10 mx-auto opacity-40" />
              <p className="text-sm">בחר לקוח כדי לנהל משתמשים והזמנות</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function NewCustomerDialog() {
  const create = useMutation(api.customers.create);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await create({ name: name.trim(), note: note.trim() || undefined });
      toast.success("הלקוח נוצר");
      setName("");
      setNote("");
      setOpen(false);
    } catch {
      toast.error("יצירת הלקוח נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          לקוח חדש
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>לקוח חדש</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname">שם הלקוח / הארגון</Label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: חברת אקמה"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnote">הערה (לא חובה)</Label>
            <Textarea
              id="cnote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Spinner className="text-primary-foreground" /> : null}
            יצירה
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetail({ customerId }: { customerId: Id<"customers"> }) {
  const users = useQuery(api.customers.usersForCustomer, { customerId });
  const invites = useQuery(api.invites.listByCustomer, { customerId });
  const createInvite = useMutation(api.invites.create);
  const revoke = useMutation(api.invites.revoke);

  const updateUser = useMutation(api.customers.updateUser);
  const deleteUser = useMutation(api.customers.deleteUser);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await createInvite({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        customerId,
      });
      toast.success(
        res.linkedExisting
          ? "המשתמש הקיים שויך ללקוח"
          : "החשבון נוצר והסיסמה נשלחה במייל ✨",
      );
      setEmail("");
      setFirstName("");
      setLastName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ההזמנה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(u: UserRow) {
    if (!confirm(`למחוק את ${u.displayName}? הפעולה אינה הפיכה.`)) return;
    try {
      await deleteUser({ userId: u._id });
      toast.success("המשתמש נמחק");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "המחיקה נכשלה");
    }
  }

  const pendingInvites = invites?.filter((i) => i.status === "pending") ?? [];

  return (
    <div className="space-y-5">
      {/* הזמנת משתמש */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <UserPlus className="size-4 text-primary" />
          הזמנת משתמש
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          הזן שם ומייל — תיווצר סיסמה חזקה אוטומטית ותישלח אליו במייל יחד עם קישור כניסה.
        </p>
        <form onSubmit={invite} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="שם פרטי"
            />
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="שם משפחה"
            />
          </div>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              dir="ltr"
              placeholder="user@example.com"
              className="flex-1"
            />
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner className="text-primary-foreground" /> : <Mail className="size-4" />}
              הזמנה
            </Button>
          </div>
        </form>
      </Card>

      {/* משתמשים פעילים */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="size-4" />
          משתמשים פעילים
        </h3>
        {users === undefined ? (
          <Spinner />
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין עדיין משתמשים מחוברים.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u._id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {u.role === "admin" && <Badge color="#0d9488">מנהל</Badge>}
                  <button
                    onClick={() => setEditing(u)}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="עריכה"
                  >
                    <Pencil className="size-4" />
                  </button>
                  {u.role !== "admin" && (
                    <button
                      onClick={() => removeUser(u)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EditUserDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSave={async (fn, ln) => {
          if (!editing) return;
          await updateUser({
            userId: editing._id,
            firstName: fn || undefined,
            lastName: ln || undefined,
          });
          toast.success("הפרטים עודכנו");
          setEditing(null);
        }}
      />

      {/* הזמנות ממתינות */}
      {pendingInvites.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Mail className="size-4" />
            הזמנות ממתינות
          </h3>
          <ul className="space-y-2">
            {pendingInvites.map((inv) => (
              <li
                key={inv._id}
                className="flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5"
              >
                <span className="text-sm" dir="ltr">{inv.email}</span>
                <button
                  onClick={async () => {
                    await revoke({ id: inv._id });
                    toast.success("ההזמנה בוטלה");
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSave,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSave: (firstName: string, lastName: string) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user]);

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>עריכת משתמש</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onSave(firstName.trim(), lastName.trim());
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "העדכון נכשל");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>שם פרטי</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>שם משפחה</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          {user && (
            <p className="text-xs text-muted-foreground" dir="ltr">
              {user.email}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Spinner className="text-primary-foreground" /> : null}
            שמירה
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
