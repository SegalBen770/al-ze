import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/authz";

/** מחזיר URL חד-פעמי להעלאת קובץ ל-Convex storage. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** מחזיר URL לצפייה בקובץ שהועלה. */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});

/** מחזיר URLs למספר קבצים בבת אחת. */
export const getUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }) => {
    await requireUser(ctx);
    const entries = await Promise.all(
      storageIds.map(async (id) => [id, await ctx.storage.getUrl(id)] as const),
    );
    return Object.fromEntries(entries) as Record<string, string | null>;
  },
});
