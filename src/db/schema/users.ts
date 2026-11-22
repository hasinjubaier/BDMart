import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().$defaultFn(() => crypto.randomUUID()).primaryKey(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 32 }).notNull().default('buyer'),
  locale: varchar('locale', { length: 10 }).notNull().default('bn'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  division: varchar('division', { length: 64 }).notNull(),
  district: varchar('district', { length: 64 }).notNull(),
  upazila: varchar('upazila', { length: 64 }).notNull(),
  line: text('line').notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sellers = pgTable('sellers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'restrict' }),
  shopName: varchar('shop_name', { length: 255 }).notNull(),
  tradeLicenseNo: varchar('trade_license_no', { length: 128 }).notNull().unique(),
  tradeLicenseUrl: text('trade_license_url').notNull(),
  nidRef: varchar('nid_ref', { length: 128 }).notNull(),
  kycStatus: varchar('kyc_status', { length: 32 }).notNull().default('pending'),
  commissionRate: integer('commission_rate').notNull().default(500),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'restrict' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  tin: varchar('tin', { length: 64 }).notNull().unique(),
  bin: varchar('bin', { length: 64 }).notNull().unique(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
