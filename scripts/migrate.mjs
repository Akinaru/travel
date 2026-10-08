// Applies pending SQL migrations from ./drizzle at container start.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Same connection rules as src/db/index.ts: DATABASE_URL, else PG* variables.
const client = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL, { max: 1 }) : postgres({ max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Migrations à jour");
} catch (error) {
  console.error("Échec des migrations :", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
