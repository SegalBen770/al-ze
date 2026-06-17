import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// סטטוס מסומן לפי "סוג" כדי לחשב זמני טיפול אוטומטית:
// open = נפתח/ממתין, active = בעבודה בפועל, done = נסגר/הושלם.
export const statusType = v.union(
  v.literal("open"),
  v.literal("active"),
  v.literal("done"),
  v.literal("waiting"), // ממתין לתשובת לקוח
);

export const userRole = v.union(v.literal("admin"), v.literal("client"));

export const inviteStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
);

export const eventKind = v.union(
  v.literal("comment"),
  v.literal("status_change"),
  v.literal("eta_change"),
  v.literal("created"),
);

const schema = defineSchema({
  // טבלאות ההזדהות של Convex Auth, עם הרחבת users בשדות שלנו.
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // שדות שלנו:
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.optional(userRole),
    customerId: v.optional(v.id("customers")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_customer", ["customerId"]),

  // לקוח = ארגון. לכל לקוח כמה משתמשים.
  customers: defineTable({
    name: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    note: v.optional(v.string()),
    createdAt: v.number(),
  }),

  // הזמנות משתמשים (Invite בלבד — אין הרשמה חופשית).
  invites: defineTable({
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    customerId: v.id("customers"),
    role: userRole,
    status: inviteStatus,
    invitedBy: v.id("users"),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_customer", ["customerId"]),

  // טאקסונומיה שהאדמין מנהל:
  statuses: defineTable({
    name: v.string(),
    color: v.string(),
    type: statusType,
    order: v.number(),
  }).index("by_order", ["order"]),

  categories: defineTable({
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
  }).index("by_order", ["order"]),

  priorities: defineTable({
    name: v.string(),
    color: v.string(),
    level: v.number(),
  }).index("by_level", ["level"]),

  tags: defineTable({
    name: v.string(),
    color: v.string(),
  }),

  tickets: defineTable({
    title: v.string(),
    description: v.string(),
    customerId: v.id("customers"),
    createdBy: v.id("users"),
    categoryId: v.optional(v.id("categories")),
    priorityId: v.optional(v.id("priorities")),
    statusId: v.id("statuses"),
    tagIds: v.array(v.id("tags")),
    attachmentIds: v.array(v.id("_storage")),
    etaAt: v.optional(v.number()),
    // סדר תצוגה ידני (קטן יותר = גבוה יותר). אם ריק — לפי createdAt.
    position: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    firstActiveAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
  })
    .index("by_customer", ["customerId"])
    .index("by_status", ["statusId"]),

  // טיים-ליין מאוחד: תגובות, שינויי סטטוס/צפי, פתיחה.
  ticketEvents: defineTable({
    ticketId: v.id("tickets"),
    authorId: v.id("users"),
    kind: eventKind,
    body: v.optional(v.string()),
    attachmentIds: v.array(v.id("_storage")),
    // מטא לאירועי מערכת (שינוי סטטוס/צפי):
    fromStatusId: v.optional(v.id("statuses")),
    toStatusId: v.optional(v.id("statuses")),
    etaAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_ticket", ["ticketId"]),
});

export default schema;
