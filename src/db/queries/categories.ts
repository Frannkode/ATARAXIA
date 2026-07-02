import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}
