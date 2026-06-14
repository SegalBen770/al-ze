import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// מוסיף את נתיבי ה-HTTP של Convex Auth (כולל Magic Link).
auth.addHttpRoutes(http);

export default http;
