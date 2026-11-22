import { pgTable, uuid, varchar, text, integer, bigint, timestamp, jsonb, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, sellers, businesses } from './users';
import { orders, orderItems } from './commerce';

export const rfqs = pgTable('rfqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 255 }).notNull(),
  spec: text('spec').notNull(),
  qty: integer('qty').notNull(),
  targetPrice: bigint('target_price', { mode: 'bigint' }),
  status: varchar('status', { length: 32 }).notNull().default('OPEN'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rfqQuotes = pgTable('rfq_quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  rfqId: uuid('rfq_id').notNull().references(() => rfqs.id, { onDelete: 'cascade' }),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'restrict' }),
  unitPrice: bigint('unit_price', { mode: 'bigint' }).notNull(),
  leadDays: integer('lead_days').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('SUBMITTED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_rfq_seller').on(table.rfqId, table.sellerId),
]);

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id').notNull().unique().references(() => orderItems.id, { onDelete: 'restrict' }),
  rating: integer('rating').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
]);

export const disputes = pgTable('disputes', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  openedBy: uuid('opened_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('OPEN'),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 128 }).notNull(),
  entity: varchar('entity', { length: 64 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
