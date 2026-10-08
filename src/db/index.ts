import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL locally; in Docker, the standard PGHOST/PGUSER/PGPASSWORD/PGDATABASE variables
// (read by postgres.js when no URL is given), so any password works without URL-encoding.
const connect = () => (process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL) : postgres());

// Reuse one connection pool across dev hot reloads.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = globalForDb.pg ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
