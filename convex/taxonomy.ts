import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/authz";
import { statusType } from "./schema";

/** כל הטאקסונומיה (סטטוסים, סיווגים, דחיפויות, תגיות) — מסודרת. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const [statuses, categories, priorities, tags] = await Promise.all([
      ctx.db.query("statuses").withIndex("by_order").collect(),
      ctx.db.query("categories").withIndex("by_order").collect(),
      ctx.db.query("priorities").withIndex("by_level").collect(),
      ctx.db.query("tags").collect(),
    ]);
    return { statuses, categories, priorities, tags };
  },
});

/** זורע ברירות מחדל אם אין עדיין סטטוסים. אידמפוטנטי. */
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("statuses").first();
    if (existing) return { seeded: false };

    const statuses = [
      { name: "נפתח", color: "#64748b", type: "open" as const, order: 0 },
      { name: "בטיפול", color: "#0ea5e9", type: "active" as const, order: 1 },
      { name: "בבדיקות", color: "#a855f7", type: "active" as const, order: 2 },
      { name: "הושלם", color: "#10b981", type: "done" as const, order: 3 },
    ];
    for (const s of statuses) await ctx.db.insert("statuses", s);

    const categories = [
      { name: "שאלה", color: "#0ea5e9", icon: "help", order: 0 },
      { name: "פיתוח", color: "#8b5cf6", icon: "code", order: 1 },
      { name: "באג", color: "#ef4444", icon: "bug", order: 2 },
    ];
    for (const c of categories) await ctx.db.insert("categories", c);

    const priorities = [
      { name: "נמוכה", color: "#94a3b8", level: 1 },
      { name: "רגילה", color: "#0ea5e9", level: 2 },
      { name: "גבוהה", color: "#f59e0b", level: 3 },
      { name: "דחוף", color: "#ef4444", level: 4 },
    ];
    for (const p of priorities) await ctx.db.insert("priorities", p);

    return { seeded: true };
  },
});

/* ----------------------------- סטטוסים ----------------------------- */

export const createStatus = mutation({
  args: { name: v.string(), color: v.string(), type: statusType },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db.query("statuses").withIndex("by_order").order("desc").first();
    return await ctx.db.insert("statuses", {
      ...args,
      order: last ? last.order + 1 : 0,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("statuses"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    type: v.optional(statusType),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    const patch = Object.fromEntries(
      Object.entries(rest).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(id, patch);
  },
});

export const deleteStatus = mutation({
  args: { id: v.id("statuses") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const inUse = await ctx.db
      .query("tickets")
      .withIndex("by_status", (q) => q.eq("statusId", id))
      .first();
    if (inUse) throw new Error("לא ניתן למחוק סטטוס שמשויך לטיקטים");
    await ctx.db.delete(id);
  },
});

/** שינוי סדר הסטטוסים לפי סדר המזהים שהתקבל. */
export const reorderStatuses = mutation({
  args: { ids: v.array(v.id("statuses")) },
  handler: async (ctx, { ids }) => {
    await requireAdmin(ctx);
    for (let i = 0; i < ids.length; i++) {
      await ctx.db.patch(ids[i], { order: i });
    }
  },
});

/* ----------------------------- סיווגים ----------------------------- */

export const createCategory = mutation({
  args: { name: v.string(), color: v.string(), icon: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const last = await ctx.db.query("categories").withIndex("by_order").order("desc").first();
    return await ctx.db.insert("categories", { ...args, order: last ? last.order + 1 : 0 });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, patch);
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

export const reorderCategories = mutation({
  args: { ids: v.array(v.id("categories")) },
  handler: async (ctx, { ids }) => {
    await requireAdmin(ctx);
    for (let i = 0; i < ids.length; i++) {
      await ctx.db.patch(ids[i], { order: i });
    }
  },
});

/* ----------------------------- דחיפויות ----------------------------- */

export const createPriority = mutation({
  args: { name: v.string(), color: v.string(), level: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("priorities", args);
  },
});

export const updatePriority = mutation({
  args: {
    id: v.id("priorities"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    level: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, patch);
  },
});

export const deletePriority = mutation({
  args: { id: v.id("priorities") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

export const reorderPriorities = mutation({
  args: { ids: v.array(v.id("priorities")) },
  handler: async (ctx, { ids }) => {
    await requireAdmin(ctx);
    for (let i = 0; i < ids.length; i++) {
      await ctx.db.patch(ids[i], { level: i + 1 });
    }
  },
});

/* ----------------------------- תגיות ----------------------------- */

export const createTag = mutation({
  args: { name: v.string(), color: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("tags", args);
  },
});

export const updateTag = mutation({
  args: { id: v.id("tags"), name: v.optional(v.string()), color: v.optional(v.string()) },
  handler: async (ctx, { id, ...rest }) => {
    await requireAdmin(ctx);
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, patch);
  },
});

export const deleteTag = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
