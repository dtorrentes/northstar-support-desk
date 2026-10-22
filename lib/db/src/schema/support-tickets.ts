import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    ticketNumber: text("ticket_number").notNull(),
    title: text("title").notNull(),
    productArea: text("product_area").notNull(),
    environment: text("environment").notNull(),
    description: text("description").notNull(),
    expectedBehavior: text("expected_behavior").notNull(),
    actualBehavior: text("actual_behavior").notNull(),
    reproductionSteps: text("reproduction_steps").notNull(),
    errorMessage: text("error_message"),
    sanitizedLogs: text("sanitized_logs"),
    customerImpact: text("customer_impact").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("New"),
    owner: text("owner"),
    resolution: text("resolution"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("support_tickets_ticket_number_idx").on(table.ticketNumber)],
);

export const ticketActivityTable = pgTable("support_ticket_activity", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => ticketsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  author: text("author").notNull().default("Support team"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketActivitySchema = createInsertSchema(
  ticketActivityTable,
).omit({
  id: true,
  createdAt: true,
});

export const ticketStatusValues = [
  "New",
  "Investigating",
  "Waiting for Customer",
  "Escalated",
  "Resolved",
  "Closed",
] as const;

export const ticketSeverityValues = [
  "Critical",
  "High",
  "Medium",
  "Low",
] as const;

export const ticketUpdateKindValues = [
  "investigation",
  "troubleshooting",
  "customer_update",
  "resolution",
] as const;

export type TicketStatus = (typeof ticketStatusValues)[number];
export type TicketSeverity = (typeof ticketSeverityValues)[number];
export type TicketUpdateKind = (typeof ticketUpdateKindValues)[number];
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
export type InsertTicketActivity = z.infer<typeof insertTicketActivitySchema>;
export type TicketActivity = typeof ticketActivityTable.$inferSelect;
