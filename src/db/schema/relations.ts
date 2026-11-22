import { relations } from 'drizzle-orm';
import { users, addresses, sellers, businesses } from './users';
import { categories, products, productVariants, priceTiers, productImages } from './catalog';
import { carts, cartItems, orders, orderItems, payments, escrowLedger, shipments } from './commerce';
import { rfqs, rfqQuotes, reviews, disputes, auditLogs } from './governance';

export const usersRelations = relations(users, ({ one, many }) => ({
  addresses: many(addresses),
  seller: one(sellers, { fields: [users.id], references: [sellers.userId] }),
  business: one(businesses, { fields: [users.id], references: [businesses.userId] }),
  orders: many(orders),
  cart: one(carts, { fields: [users.id], references: [carts.userId] }),
  disputes: many(disputes),
  auditLogs: many(auditLogs),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  user: one(users, { fields: [sellers.userId], references: [users.id] }),
  products: many(products),
  orderItems: many(orderItems),
  escrowLedgers: many(escrowLedger),
  rfqQuotes: many(rfqQuotes),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  user: one(users, { fields: [businesses.userId], references: [users.id] }),
  rfqs: many(rfqs),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'subcategories' }),
  subcategories: many(categories, { relationName: 'subcategories' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(sellers, { fields: [products.sellerId], references: [sellers.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  priceTiers: many(priceTiers),
  images: many(productImages),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const priceTiersRelations = relations(priceTiers, ({ one }) => ({
  product: one(products, { fields: [priceTiers.productId], references: [products.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  items: many(orderItems),
  payment: one(payments, { fields: [orders.id], references: [payments.orderId] }),
  escrow: one(escrowLedger, { fields: [orders.id], references: [escrowLedger.orderId] }),
  shipment: one(shipments, { fields: [orders.id], references: [shipments.orderId] }),
  disputes: many(disputes),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
  seller: one(sellers, { fields: [orderItems.sellerId], references: [sellers.id] }),
  review: one(reviews, { fields: [orderItems.id], references: [reviews.orderItemId] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const escrowLedgerRelations = relations(escrowLedger, ({ one }) => ({
  order: one(orders, { fields: [escrowLedger.orderId], references: [orders.id] }),
  seller: one(sellers, { fields: [escrowLedger.sellerId], references: [sellers.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}));

export const rfqsRelations = relations(rfqs, ({ one, many }) => ({
  business: one(businesses, { fields: [rfqs.businessId], references: [businesses.id] }),
  quotes: many(rfqQuotes),
}));

export const rfqQuotesRelations = relations(rfqQuotes, ({ one }) => ({
  rfq: one(rfqs, { fields: [rfqQuotes.rfqId], references: [rfqs.id] }),
  seller: one(sellers, { fields: [rfqQuotes.sellerId], references: [sellers.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  orderItem: one(orderItems, { fields: [reviews.orderItemId], references: [orderItems.id] }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  order: one(orders, { fields: [disputes.orderId], references: [orders.id] }),
  openedByUser: one(users, { fields: [disputes.openedBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
