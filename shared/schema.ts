import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// File processing types
export const ProcessingStatus = z.enum(['pending', 'processing', 'completed', 'error']);
export type ProcessingStatus = z.infer<typeof ProcessingStatus>;

export interface ProcessingResult {
  status: ProcessingStatus;
  message?: string;
  downloadUrl?: string;
}
