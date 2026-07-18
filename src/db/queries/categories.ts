import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { isValidUuid } from "@/lib/uuid";

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategoryById(id: string) {
  if (!isValidUuid(id)) return undefined;

  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  return category;
}
