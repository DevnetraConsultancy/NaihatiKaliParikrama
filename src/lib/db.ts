/**
 * Neon Postgres access. The whole app is designed to run with or without a
 * database: when DATABASE_URL is missing (or Neon is unreachable) every reader
 * falls back to the bundled seed data, so a fresh Vercel deploy works before
 * any environment variable is configured.
 */
import { neon } from "@neondatabase/serverless";

let cachedClient: ReturnType<typeof neon> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): ReturnType<typeof neon> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!cachedClient) {
    cachedClient = neon(connectionString);
  }
  return cachedClient;
}

/** Runs a query, returning `fallback` instead of throwing when there is no DB. */
export async function tryQuery<T>(run: () => Promise<unknown>, fallback: T): Promise<T> {
  if (!hasDatabase()) return fallback;
  try {
    return (await run()) as T;
  } catch (error) {
    console.error("[db] query failed, using fallback:", (error as Error).message);
    return fallback;
  }
}
