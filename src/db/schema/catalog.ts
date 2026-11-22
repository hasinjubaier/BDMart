import { pgTable, uuid, varchar, text, boolean, integer, bigint, timestamp, jsonb, unique, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sellers } from './users';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'restrict' }),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  nameBn: varchar('name_bn', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'restrict' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  titleBn: varchar('title_bn', { length: 255 }).notNull(),
  titleEn: varchar('title_en', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('draft'),
  basePrice: bigint('base_price', { mode: 'bigint' }).notNull(),
  moq: integer('moq').notNull().default(1),
  isB2bEnabled: boolean('is_b2b_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_products_slug').on(table.slug),
  index('idx_products_cat_status').on(table.categoryId, table.status),
]);

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 128 }).notNull().unique(),
  attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
  stock: integer('stock').notNull().default(0),
  price: bigint('price', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const priceTiers = pgTable('price_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  minQty: integer('min_qty').notNull(),
  unitPrice: bigint('unit_price', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_product_tier').on(table.productId, table.minQty),
  index('idx_price_tiers_product_min').on(table.productId, table.minQty),
]);

export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
