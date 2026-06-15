import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  requireAdmin,
  requireTicketAccess,
  requireUser,
} from "./lib/authz";

/** תאריך קצר לתצוגה במייל (DD.MM.YYYY). */
function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
}

/* ----------------------------- עזרי העשרה ----------------------------- */

async function loadTaxonomyMaps(ctx: QueryCtx) {
  const [statuses, categories, priorities, tags] = await Promise.all([
    ctx.db.query("statuses").collect(),
    ctx.db.query("categories").collect(),
    ctx.db.query("priorities").collect(),
    ctx.db.query("tags").collect(),
  ]);
  return {
    statusMap: new Map(statuses.map((s) => [s._id, s])),
    categoryMap: new Map(categories.map((c) => [c._id, c])),
    priorityMap: new Map(priorities.map((p) => [p._id, p])),
    tagMap: new Map(tags.map((t) => [t._id, t])),
  };
}

type TaxonomyMaps = Awaited<ReturnType<typeof loadTaxonomyMaps>>;

function enrichTicket(
  ticket: Doc<"tickets">,
  maps: TaxonomyMaps,
  customerName: string | undefined,
  creatorName: string | undefined,
) {
  return {
    ...ticket,
    status: maps.statusMap.get(ticket.statusId) ?? null,
    category: ticket.categoryId ? maps.categoryMap.get(ticket.categoryId) ?? null : null,
    priority: ticket.priorityId ? maps.priorityMap.get(ticket.priorityId) ?? null : null,
    tags: ticket.tagIds.map((id) => maps.tagMap.get(id)).filter(Boolean),
    customerName: customerName ?? null,
    creatorName: creatorName ?? null,
  };
}

/** מחשב מדדי זמן מתוך אירועי הסטטוס. */
function computeMetrics(
  ticket: Doc<"tickets">,
  statusEvents: Doc<"ticketEvents">[],
  statusMap: TaxonomyMaps["statusMap"],
) {
  const now = Date.now();
  const closedAt = ticket.closedAt;
  const sorted = [...statusEvents].sort((a, b) => a.createdAt - b.createdAt);

  let activeMs = 0;
  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const toId = ev.toStatusId;
    if (!toId) continue;
    const type = statusMap.get(toId)?.type;
    const start = ev.createdAt;
    const end = sorted[i + 1]?.createdAt ?? closedAt ?? now;
    if (type === "active") activeMs += Math.max(0, end - start);
  }

  const totalMs = (closedAt ?? now) - ticket.createdAt;
  return {
    createdAt: ticket.createdAt,
    firstActiveAt: ticket.firstActiveAt ?? null,
    closedAt: closedAt ?? null,
    isClosed: closedAt != null,
    totalMs,
    activeMs,
  };
}

/* ----------------------------- שאילתות ----------------------------- */

/** רשימת טיקטים לפי הרשאות (אדמין=הכל, לקוח=הלקוח שלו). */
export const list = query({
  args: { customerId: v.optional(v.id("customers")) },
  handler: async (ctx, { customerId }) => {
    const user = await requireUser(ctx);

    let tickets: Doc<"tickets">[];
    if (user.role === "admin") {
      tickets = customerId
        ? await ctx.db
            .query("tickets")
            .withIndex("by_customer", (q) => q.eq("customerId", customerId))
            .order("desc")
            .collect()
        : await ctx.db.query("tickets").order("desc").collect();
    } else {
      tickets = await ctx.db
        .query("tickets")
        .withIndex("by_customer", (q) => q.eq("customerId", user.customerId!))
        .order("desc")
        .collect();
    }

    const maps = await loadTaxonomyMaps(ctx);
    const customers = await ctx.db.query("customers").collect();
    const customerMap = new Map(customers.map((c) => [c._id, c.name]));

    const creatorIds = [...new Set(tickets.map((t) => t.createdBy))];
    const creators = await Promise.all(creatorIds.map((id) => ctx.db.get(id)));
    const creatorMap = new Map(
      creators.filter(Boolean).map((u) => [u!._id, u!.name ?? u!.email ?? "משתמש"]),
    );

    return tickets.map((t) =>
      enrichTicket(t, maps, customerMap.get(t.customerId), creatorMap.get(t.createdBy)),
    );
  },
});

/** טיקט בודד עם טיים-ליין מלא ומדדי זמן. */
export const getWithMetrics = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const { ticket } = await requireTicketAccess(ctx, ticketId);
    const maps = await loadTaxonomyMaps(ctx);

    const customer = await ctx.db.get(ticket.customerId);
    const creator = await ctx.db.get(ticket.createdBy);

    const events = await ctx.db
      .query("ticketEvents")
      .withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
      .order("asc")
      .collect();

    // שמות מחברים לאירועים.
    const authorIds = [...new Set(events.map((e) => e.authorId))];
    const authors = await Promise.all(authorIds.map((id) => ctx.db.get(id)));
    const authorMap = new Map(
      authors.filter(Boolean).map((u) => [u!._id, u!.name ?? u!.email ?? "משתמש"]),
    );

    // כתובות לכל הקבצים המצורפים בטיים-ליין.
    const allStorageIds = events.flatMap((e) => e.attachmentIds);
    const urlEntries = await Promise.all(
      allStorageIds.map(async (id) => [id, await ctx.storage.getUrl(id)] as const),
    );
    const urlMap = new Map(urlEntries);

    const timeline = events.map((e) => ({
      ...e,
      authorName: authorMap.get(e.authorId) ?? "משתמש",
      fromStatus: e.fromStatusId ? maps.statusMap.get(e.fromStatusId) ?? null : null,
      toStatus: e.toStatusId ? maps.statusMap.get(e.toStatusId) ?? null : null,
      attachments: e.attachmentIds.map((id) => ({ id, url: urlMap.get(id) ?? null })),
    }));

    const statusEvents = events.filter(
      (e) => e.kind === "created" || e.kind === "status_change",
    );
    const metrics = computeMetrics(ticket, statusEvents, maps.statusMap);

    return {
      ticket: enrichTicket(
        ticket,
        maps,
        customer?.name,
        creator?.name ?? creator?.email ?? undefined,
      ),
      timeline,
      metrics,
    };
  },
});

/* ----------------------------- מוטציות ----------------------------- */

/** בוחר את סטטוס ברירת המחדל לפתיחה (open עם order נמוך, אחרת הראשון). */
async function pickInitialStatus(ctx: QueryCtx): Promise<Doc<"statuses">> {
  const statuses = await ctx.db.query("statuses").withIndex("by_order").collect();
  if (statuses.length === 0) {
    throw new Error("צריך להגדיר סטטוסים לפני פתיחת טיקט");
  }
  return statuses.find((s) => s.type === "open") ?? statuses[0];
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    categoryId: v.optional(v.id("categories")),
    priorityId: v.optional(v.id("priorities")),
    tagIds: v.optional(v.array(v.id("tags"))),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
    // נדרש רק כשהאדמין פותח טיקט עבור לקוח.
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    let customerId: Id<"customers">;
    if (user.role === "admin") {
      if (!args.customerId) throw new Error("יש לבחור לקוח");
      customerId = args.customerId;
    } else {
      customerId = user.customerId!;
    }

    const status = await pickInitialStatus(ctx);
    const now = Date.now();
    const attachmentIds = args.attachmentIds ?? [];

    const ticketId = await ctx.db.insert("tickets", {
      title: args.title.trim(),
      description: args.description.trim(),
      customerId,
      createdBy: user._id,
      categoryId: args.categoryId,
      priorityId: args.priorityId,
      statusId: status._id,
      tagIds: args.tagIds ?? [],
      attachmentIds,
      createdAt: now,
      updatedAt: now,
      firstActiveAt: status.type === "active" ? now : undefined,
      closedAt: status.type === "done" ? now : undefined,
    });

    // אירוע פתיחה — נושא את הסטטוס ההתחלתי לצורך חישוב זמנים.
    await ctx.db.insert("ticketEvents", {
      ticketId,
      authorId: user._id,
      kind: "created",
      body: args.description.trim(),
      attachmentIds,
      toStatusId: status._id,
      createdAt: now,
    });

    // טיקט שנפתח ע"י לקוח (לא המנהל) → המנהל מקבל התראה במייל.
    if (user.role !== "admin") {
      await ctx.scheduler.runAfter(0, internal.emails.notify, {
        toAdmin: true,
        kind: "new_ticket",
        ticketId,
        ticketTitle: args.title.trim(),
        actorName: user.name ?? user.email ?? "משתמש",
      });
    }

    return ticketId;
  },
});

export const addComment = mutation({
  args: {
    ticketId: v.id("tickets"),
    body: v.string(),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, { ticketId, body, attachmentIds }) => {
    const { user, ticket } = await requireTicketAccess(ctx, ticketId);
    const trimmed = body.trim();
    const files = attachmentIds ?? [];
    if (!trimmed && files.length === 0) throw new Error("התגובה ריקה");
    const now = Date.now();

    await ctx.db.insert("ticketEvents", {
      ticketId,
      authorId: user._id,
      kind: "comment",
      body: trimmed,
      attachmentIds: files,
      createdAt: now,
    });
    await ctx.db.patch(ticketId, { updatedAt: now });

    // התראות מייל על תגובה חדשה.
    const actorName = user.name ?? user.email ?? "משתמש";
    const snippet = trimmed.slice(0, 200);
    if (user.role === "admin") {
      // המנהל הגיב → פותח הטיקט מקבל מייל (אם אינו המנהל עצמו).
      const opener = await ctx.db.get(ticket.createdBy);
      if (opener && opener._id !== user._id && opener.email) {
        await ctx.scheduler.runAfter(0, internal.emails.notify, {
          to: opener.email,
          kind: "new_comment",
          ticketId,
          ticketTitle: ticket.title,
          actorName,
          snippet,
        });
      }
    } else {
      // לקוח הגיב → המנהל מקבל מייל.
      await ctx.scheduler.runAfter(0, internal.emails.notify, {
        toAdmin: true,
        kind: "new_comment",
        ticketId,
        ticketTitle: ticket.title,
        actorName,
        snippet,
      });
    }
  },
});

export const changeStatus = mutation({
  args: { ticketId: v.id("tickets"), statusId: v.id("statuses") },
  handler: async (ctx, { ticketId, statusId }) => {
    const admin = await requireAdmin(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("הטיקט לא נמצא");
    if (ticket.statusId === statusId) return;

    const newStatus = await ctx.db.get(statusId);
    if (!newStatus) throw new Error("סטטוס לא קיים");
    const now = Date.now();

    const patch: Partial<Doc<"tickets">> = {
      statusId,
      updatedAt: now,
    };
    if (newStatus.type === "active" && !ticket.firstActiveAt) {
      patch.firstActiveAt = now;
    }
    if (newStatus.type === "done") {
      patch.closedAt = now;
    } else if (ticket.closedAt) {
      // פתיחה מחדש מסטטוס "הושלם".
      patch.closedAt = undefined;
    }

    await ctx.db.patch(ticketId, patch);
    await ctx.db.insert("ticketEvents", {
      ticketId,
      authorId: admin._id,
      kind: "status_change",
      attachmentIds: [],
      fromStatusId: ticket.statusId,
      toStatusId: statusId,
      createdAt: now,
    });

    // פותח הטיקט מקבל מייל על שינוי הסטטוס.
    const opener = await ctx.db.get(ticket.createdBy);
    if (opener && opener._id !== admin._id && opener.email) {
      await ctx.scheduler.runAfter(0, internal.emails.notify, {
        to: opener.email,
        kind: "status",
        ticketId,
        ticketTitle: ticket.title,
        actorName: admin.name ?? admin.email ?? "הצוות",
        body: newStatus.name,
      });
    }
  },
});

export const setEta = mutation({
  args: { ticketId: v.id("tickets"), etaAt: v.optional(v.number()) },
  handler: async (ctx, { ticketId, etaAt }) => {
    const admin = await requireAdmin(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("הטיקט לא נמצא");
    const now = Date.now();
    await ctx.db.patch(ticketId, { etaAt, updatedAt: now });
    await ctx.db.insert("ticketEvents", {
      ticketId,
      authorId: admin._id,
      kind: "eta_change",
      attachmentIds: [],
      etaAt,
      createdAt: now,
    });

    // פותח הטיקט מקבל מייל על עדכון הצפי.
    const opener = await ctx.db.get(ticket.createdBy);
    if (opener && opener._id !== admin._id && opener.email) {
      await ctx.scheduler.runAfter(0, internal.emails.notify, {
        to: opener.email,
        kind: "eta",
        ticketId,
        ticketTitle: ticket.title,
        actorName: admin.name ?? admin.email ?? "הצוות",
        body: etaAt
          ? `נקבע צפי לסיום: ${shortDate(etaAt)}`
          : "הצפי לסיום הוסר.",
      });
    }
  },
});

export const update = mutation({
  args: {
    ticketId: v.id("tickets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    priorityId: v.optional(v.id("priorities")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, { ticketId, ...rest }) => {
    await requireAdmin(ctx);
    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(rest).filter(([, val]) => val !== undefined),
    );
    patch.updatedAt = Date.now();
    await ctx.db.patch(ticketId, patch as Partial<Doc<"tickets">>);
  },
});
