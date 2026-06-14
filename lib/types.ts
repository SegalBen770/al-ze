import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type EnrichedTicket = FunctionReturnType<typeof api.tickets.list>[number];
export type TicketDetail = FunctionReturnType<typeof api.tickets.getWithMetrics>;
export type Taxonomy = FunctionReturnType<typeof api.taxonomy.list>;
export type CurrentUser = NonNullable<FunctionReturnType<typeof api.users.current>>;
