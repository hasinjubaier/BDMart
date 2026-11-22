import { pgTable, uuid, varchar, integer, bigint, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, sellers } from './users';
import { productVariants } from './catalog';

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'restrict' }),
  qty: integer('qty').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_cart_variant').on(table.cartId, table.variantId),
]);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  type: varchar('type', { length: 16 }).notNull().default('b2c'),
  status: varchar('status', { length: 32 }).notNull().default('PENDING'),
  subtotal: bigint('subtotal', { mode: 'bigint' }).notNull(),
  deliveryFee: bigint('delivery_fee', { mode: 'bigint' }).notNull(),
  vat: bigint('vat', { mode: 'bigint' }).notNull(),
  total: bigint('total', { mode: 'bigint' }).notNull(),
  addressSnapshot: jsonb('address_snapshot').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_orders_buyer_created').on(table.buyerId, table.createdAt),
]);

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'restrict' }),
  qty: integer('qty').notNull(),
  unitPrice: bigint('unit_price', { mode: 'bigint' }).notNull(),
  titleSnapshot: varchar('title_snapshot', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  gateway: varchar('gateway', { length: 32 }).notNull(),
  txnId: varchar('txn_id', { length: 128 }).notNull().unique(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const escrowLedger = pgTable('escrow_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().unique().references(() => orders.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'restrict' }),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  platformFee: bigint('platform_fee', { mode: 'bigint' }).notNull().default(sql`0`),
  state: varchar('state', { length: 32 }).notNull().default('held'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().unique().references(() => orders.id, { onDelete: 'restrict' }),
  courier: varchar('courier', { length: 32 }).notNull(),
  trackingNo: varchar('tracking_no', { length: 128 }).notNull().unique(),
  consignmentId: varchar('consignment_id', { length: 128 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
