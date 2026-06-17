"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePicker } from "@/components/ImagePicker";
import { Spinner } from "@/components/ui/spinner";
import { CalmCheck } from "@/components/animations/CalmCheck";
import { useUploadImages } from "@/lib/useFileUpload";
import type { CurrentUser } from "@/lib/types";

export function CreateTicketDialog({ me }: { me: CurrentUser }) {
  const taxonomy = useQuery(api.taxonomy.list);
  const customers = useQuery(api.customers.list, me.isAdmin ? {} : "skip");
  const [customerId, setCustomerId] = useState<string>("");
  const customerUsers = useQuery(
    api.customers.usersForCustomer,
    me.isAdmin && customerId
      ? { customerId: customerId as Id<"customers"> }
      : "skip",
  );
  const createTicket = useMutation(api.tickets.create);
  const uploadImages = useUploadImages();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priorityId, setPriorityId] = useState<string>("");
  const [openedById, setOpenedById] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  function reset() {
    setTitle("");
    setDescription("");
    setCategoryId("");
    setPriorityId("");
    setCustomerId("");
    setOpenedById("");
    setFiles([]);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("צריך כותרת לטיקט");
    if (me.isAdmin && !customerId) return toast.error("יש לבחור לקוח");
    setSubmitting(true);
    try {
      const attachmentIds = files.length ? await uploadImages(files) : [];
      const newId = await createTicket({
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
        priorityId: priorityId ? (priorityId as Id<"priorities">) : undefined,
        attachmentIds,
        customerId: me.isAdmin ? (customerId as Id<"customers">) : undefined,
        openedById:
          me.isAdmin && openedById ? (openedById as Id<"users">) : undefined,
      });
      setSuccess(true);
      // רגע של ביטחון לפני מעבר.
      setTimeout(() => {
        setOpen(false);
        reset();
        router.push(`/tickets/${newId}`);
      }, 1600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "פתיחת הטיקט נכשלה");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && !submitting) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="shadow-md">
          <Plus className="size-5" />
          טיקט חדש
        </Button>
      </DialogTrigger>
      <DialogContent>
        {success ? (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <CalmCheck size={110} />
            <h3 className="text-xl font-bold">התקבל, ואני על זה 🌿</h3>
            <p className="text-muted-foreground">
              הטיקט נפתח בהצלחה. אפשר להירגע — אני אטפל בזה ואעדכן אותך בכל שלב.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>פתיחת טיקט חדש</DialogTitle>
              <DialogDescription>
                ספר לי במה אפשר לעזור. ככל שתפרט יותר — כך אטפל מהר יותר.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {me.isAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>לקוח</Label>
                    <Select
                      value={customerId}
                      onValueChange={(v) => {
                        setCustomerId(v);
                        setOpenedById("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר לקוח" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>נפתח ע״י</Label>
                    <Select
                      value={openedById}
                      onValueChange={setOpenedById}
                      disabled={!customerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="אני (מנהל)" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerUsers?.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">כותרת</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="במשפט אחד — מה קרה?"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">פירוט</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="הסבר, צעדים לשחזור, מה ציפית שיקרה..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>סיווג</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="סוג הפנייה" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxonomy?.categories.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>דחיפות</Label>
                  <Select value={priorityId} onValueChange={setPriorityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="רמת דחיפות" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxonomy?.priorities.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>תמונות (לא חובה)</Label>
                <ImagePicker files={files} onChange={setFiles} />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <Spinner className="text-primary-foreground" /> : null}
                פתיחת הטיקט
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
