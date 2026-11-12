/**
 * BDMart Baseline Seed Script
 * Prepares system foundation data (roles, core permissions) when migrations are executed.
 */

export const INITIAL_ROLES = [
  {
    code: "SUPER_ADMIN",
    name: "Super Administrator",
    description: "Platform owner with unrestricted access",
  },
  {
    code: "MODERATOR",
    name: "Operations Moderator",
    description: "Reviews catalog listings and merchant applications",
  },
  {
    code: "FINANCE_ADMIN",
    name: "Finance Administrator",
    description: "Manages settlements, payouts, and ledger reconciliation",
  },
  {
    code: "SELLER_OWNER",
    name: "Merchant Business Owner",
    description: "Owner of a verified seller storefront",
  },
  {
    code: "SELLER_STAFF",
    name: "Merchant Staff",
    description: "Seller employee managing inventory and order fulfillment",
  },
  {
    code: "BUSINESS_BUYER",
    name: "Wholesale Business Buyer",
    description: "Verified business procuring via B2B & RFQs",
  },
  {
    code: "CONSUMER",
    name: "Retail Consumer",
    description: "Individual retail customer",
  },
];

export async function runSeed() {
  console.log(
    "BDMart database seed baseline ready. Awaiting migration execution in subsequent milestones.",
  );
}
