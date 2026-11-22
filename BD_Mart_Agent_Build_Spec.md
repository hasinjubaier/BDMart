# BD Mart: সম্পূর্ণ টেকনিক্যাল ডকুমেন্টেশন ও এজেন্ট বিল্ড গাইড
> B2C + B2B ই-কমার্স মার্কেটপ্লেস | সংস্করণ ১.০ | নভেম্বর ২০২৬ | লক্ষ্য: Antigravity এজেন্ট দিয়ে শূন্য থেকে প্রোডাকশন-গ্রেড ডিপ্লয়

---

## ০. এই ডকুমেন্ট কীভাবে ব্যবহার করবেন
এই ডকুমেন্ট একই সাথে মানুষের জন্য স্পেসিফিকেশন এবং AI কোডিং এজেন্টের জন্য নির্দেশনা। ব্যবহারের নিয়ম:
1. প্রজেক্ট রুটে `AGENTS.md` নামে একটি ফাইল বানিয়ে সেকশন ১১ (Do / Don't) এবং সেকশন ২ (টেক স্ট্যাক) কপি করে রাখুন। Antigravity-তে প্রজেক্ট রুলস/ওয়ার্কফ্লো কোথায় বসাতে হয় তা টুলের সর্বশেষ ডকুমেন্টেশনে যাচাই করুন, কারণ এই ফিচার বদলাতে পারে।
2. এজেন্টকে একবারে একটি ফেজ দিন (সেকশন ৬)। প্রতিটি ফেজের শেষে "Acceptance Criteria" পূরণ না হলে পরের ফেজে যাবেন না।
3. প্রতিটি ফেজ শেষে কোড রিভিউ করুন, টেস্ট চালান, তারপর গিটে কমিট করুন।
4. কোনো লাইব্রেরির সংস্করণ এখানে বেঁধে দেওয়া নেই। এজেন্ট যেন সর্বশেষ stable সংস্করণ ইনস্টল করে এবং ইনস্টলের আগে অফিসিয়াল ডকুমেন্টেশন দেখে নেয়।

**একটি সৎ সতর্কতা:** Lighthouse-এ ১০০/১০০ স্কোর মূল পেজগুলোতে (হোম, ক্যাটাগরি, পণ্য) অর্জনযোগ্য লক্ষ্য। কিন্তু কোনো সফটওয়্যারে "সব ক্ষেত্রে ১০০ গ্যারান্টি" দেওয়া যায় না, কারণ থার্ড-পার্টি স্ক্রিপ্ট (পেমেন্ট, অ্যানালিটিক্স) ও নেটওয়ার্ক স্কোর কমাতে পারে। আন্তর্জাতিক ক্লায়েন্টকে "মেজারেবল কোয়ালিটি টার্গেট" হিসেবে দেখান, গ্যারান্টি হিসেবে নয়।

---

## ১. প্রজেক্ট ওভারভিউ
- **নাম:** BD Mart
- **ভিশন:** বাংলাদেশের বিশ্বাসযোগ্য মার্কেটপ্লেস, যেখানে খুচরা (B2C) ও পাইকারি (B2B) একই প্ল্যাটফর্মে।

### ইউজার রোল:
| রোল | বর্ণনা |
|---|---|
| `buyer` | সাধারণ ক্রেতা (B2C) |
| `business_buyer` | যাচাইকৃত ব্যবসায়িক ক্রেতা (B2B), পাইকারি দাম ও RFQ দেখতে পায় |
| `seller` | KYC-যাচাইকৃত বিক্রেতা |
| `admin` | প্ল্যাটফর্ম অ্যাডমিন |

### মূল ডিফারেনশিয়েটর:
- চেকআউটের আগেই চূড়ান্ত দাম (ডেলিভারিসহ), কোনো লুকানো চার্জ নেই।
- এসক্রো পেমেন্ট (ডেলিভারি নিশ্চিত হলে সেলার টাকা পায়)।
- স্তরভিত্তিক পাইকারি দাম, MOQ ও RFQ।
- বাংলা-ফার্স্ট, মোবাইল-ফার্স্ট অভিজ্ঞতা।
- ভেরিফায়েড সেলার ও ব্যবসায়িক ব্যাজ।

### নন-গোল (প্রথম সংস্করণে করা হবে না):
- নিজস্ব ডেলিভারি ফ্লিট।
- ক্রেডিট/লোন সিস্টেম।
- নেটিভ মোবাইল অ্যাপ।
- মাল্টি-কারেন্সি।

---

## ২. টেক স্ট্যাক ও ভাষা
**প্রধান ভাষা:** TypeScript (strict mode)। পুরো প্রজেক্টে `any` টাইপ নিষিদ্ধ।

| স্তর | টুল | নোট |
|---|---|---|
| ফ্রেমওয়ার্ক | Next.js (App Router), React, Server Components ডিফল্ট | SEO ও পারফরম্যান্সের জন্য |
| স্টাইল | Tailwind CSS + shadcn/ui | ডিজাইন টোকেন ভেরিয়েবল দিয়ে |
| ডাটাবেস | Neon (serverless PostgreSQL) | Docker লাগবে না, ব্রাঞ্চিং ব্যবহার করুন |
| ORM | Drizzle ORM + drizzle-kit | টাইপ-সেফ মাইগ্রেশন |
| অথ | Firebase Authentication (ফোন OTP + Google) | সার্ভারে firebase-admin দিয়ে যাচাই |
| ফাইল | Firebase Storage | ছবি ও KYC ডকুমেন্ট |
| ভ্যালিডেশন | Zod | সব ইনপুটের জন্য বাধ্যতামূলক |
| ফর্ম | React Hook Form + Zod resolver | |
| স্টেট/ডেটা ফেচ | Server Actions + TanStack Query | শুধু ক্লায়েন্ট ইন্টারঅ্যাকশনে |
| পেমেন্ট | SSLCommerz বা aamarPay | sandbox থেকে শুরু |
| কুরিয়ার | Pathao / Steadfast API | অ্যাডাপ্টার প্যাটার্নে |
| AI | Claude API (সার্ভার সাইডে) | মডেল নাম এনভায়রনমেন্ট ভেরিয়েবলে |
| টেস্ট | Vitest (ইউনিট), Playwright (E2E) | |
| কোয়ালিটি | ESLint, Prettier, Husky + lint-staged | |
| CI/CD | GitHub Actions | |
| হোস্টিং | Firebase App Hosting (বিকল্প: Vercel) | Docker ছাড়াই ক্লাউডে বিল্ড |
| মনিটরিং | Sentry, Firebase/Google Analytics | |

- **ইন্টারন্যাশনালাইজেশন:** `next-intl` দিয়ে বাংলা (ডিফল্ট) ও ইংরেজি। সব টেক্সট অনুবাদ ফাইলে থাকবে, কোডে হার্ডকোড নয়।
- **প্যাকেজ ম্যানেজার:** `pnpm` (বা `npm`, তবে একটিই ব্যবহার করুন)। Node.js: সর্বশেষ LTS।

---

## ৩. ফোল্ডার স্ট্রাকচার
```text
bdmart/
├── AGENTS.md               # এজেন্ট নিয়ম
├── README.md
├── docs/                   # আর্কিটেকচার, API, রানবুক
├── drizzle/                # মাইগ্রেশন ফাইল
├── e2e/                    # Playwright টেস্ট
├── messages/               # bn.json, en.json
├── public/
└── src/
    ├── app/
    │   ├── [locale]/
    │   │   ├── (store)/    # হোম, ক্যাটাগরি, পণ্য, কার্ট, চেকআউট
    │   │   ├── (account)/  # প্রোফাইল, অর্ডার, ঠিকানা
    │   │   ├── (business)/ # B2B: RFQ, পাইকারি অর্ডার
    │   │   ├── (seller)/   # সেলার ড্যাশবোর্ড
    │   │   └── (admin)/    # অ্যাডমিন প্যানেল
    │   └── api/            # ওয়েবহুক (payment, courier)
    ├── components/ui/      # shadcn কম্পোনেন্ট
    ├── components/         # ফিচার কম্পোনেন্ট
    ├── db/
    │   ├── schema/         # Drizzle স্কিমা (টেবিল অনুযায়ী ফাইল)
    │   └── index.ts        # Neon কানেকশন
    ├── lib/
    │   ├── auth/           # Firebase client/admin, সেশন
    │   ├── payments/       # gateway adapter
    │   ├── couriers/       # courier adapter
    │   ├── ai/             # Claude client, prompts
    │   └── validators/     # Zod স্কিমা
    ├── server/             # সার্ভিস লেয়ার (ব্যবসায়িক লজিক)
    └── env.ts              # Zod দিয়ে env ভ্যালিডেশন
```

**স্তর নিয়ম:** UI কম্পোনেন্ট সরাসরি ডাটাবেস ছুঁবে না। প্রবাহ: `UI → Server Action/Route → server/ সার্ভিস → db/`। ব্যবসায়িক লজিক (দাম, MOQ, এসক্রো) শুধু `server/` -এ থাকবে।

---

## ৪. ডাটাবেস স্কিমা
সব টেবিলে `id (uuid)`, `created_at`, `updated_at`। টাকার অঙ্ক পয়সায় (`integer`) রাখুন, কখনও `float` নয়।

| টেবিল | মূল কলাম |
|---|---|
| `users` | firebase_uid (unique), phone, email, name, role, locale |
| `addresses` | user_id, division, district, upazila, line, phone, is_default |
| `sellers` | user_id, shop_name, trade_license_no, nid_ref, kyc_status (pending/approved/rejected), commission_rate |
| `businesses` | user_id, company_name, tin, bin, verified_at |
| `categories` | parent_id, slug, name_bn, name_en |
| `products` | seller_id, category_id, slug, title_bn, title_en, description, status, base_price, moq, is_b2b_enabled |
| `product_variants` | product_id, sku, attributes (jsonb), stock, price |
| `price_tiers` | product_id, min_qty, unit_price |
| `product_images` | product_id, storage_path, sort |
| `carts`, `cart_items` | user_id, variant_id, qty |
| `orders` | buyer_id, type (b2c/b2b), status, subtotal, delivery_fee, vat, total, address_snapshot |
| `order_items` | order_id, variant_id, seller_id, qty, unit_price, title_snapshot |
| `payments` | order_id, gateway, txn_id, amount, status, raw_payload |
| `escrow_ledger` | order_id, seller_id, amount, state (held/released/refunded), released_at |
| `shipments` | order_id, courier, tracking_no, status |
| `rfqs` | business_id, title, spec, qty, target_price, status, expires_at |
| `rfq_quotes` | rfq_id, seller_id, unit_price, lead_days, status |
| `reviews` | order_item_id, rating, body (শুধু ডেলিভারিপ্রাপ্ত ক্রেতা) |
| `disputes` | order_id, opened_by, reason, status, resolution |
| `audit_logs` | actor_id, action, entity, entity_id, meta, ip |

- **ইনডেক্স:** `products(slug)`, `products(category_id, status)`, `orders(buyer_id, created_at)`, `price_tiers(product_id, min_qty)`। সার্চের জন্য PostgreSQL full-text (`tsvector`) দিয়ে শুরু করুন।
- **মাইগ্রেশন নিয়ম:** স্কিমা বদলালে `drizzle-kit generate` দিয়ে মাইগ্রেশন ফাইল বানিয়ে গিটে কমিট করুন। প্রথমে Neon-এর dev ব্রাঞ্চে চালিয়ে যাচাই করুন, তারপর main -এ।

---

## ৫. অথেনটিকেশন ও অথরাইজেশন
1. ক্লায়েন্টে Firebase দিয়ে লগইন (ফোন OTP/Google)।
2. ক্লায়েন্ট ID টোকেন সার্ভারে পাঠায়। সার্ভার `firebase-admin` দিয়ে যাচাই করে `HttpOnly`, `Secure`, `SameSite=Lax` সেশন কুকি সেট করে।
3. প্রতিটি Server Action ও Route Handler শুরুতেই `requireRole([...])` হেল্পার দিয়ে ইউজার ও রোল যাচাই করবে।
4. অনুমতি সবসময় সার্ভারে যাচাই হবে। UI-তে বাটন লুকানো নিরাপত্তা নয়।
5. সেলার শুধু নিজের পণ্য/অর্ডার দেখতে ও বদলাতে পারবে (`ownership check`)।
6. B2B দাম ও RFQ শুধু `business_buyer` (ভেরিফায়েড) দেখতে পাবে।
7. Firebase Storage রুলস: ছবি পাবলিক রিড, শুধু মালিক রাইট; KYC ডকুমেন্ট প্রাইভেট, শুধু মালিক ও অ্যাডমিন রিড।

---

## ৬. ফেজ-ভিত্তিক বাস্তবায়ন পরিকল্পনা
- **ফেজ ০:** প্রজেক্ট সেটআপ (Next.js, Tailwind, Drizzle, Neon, lint, tsc, strict, env.ts)
- **ফেজ ১:** ডাটাবেস ও অথ (Drizzle স্কিমা, সিড স্ক্রিপ্ট, Firebase সেশন কুকি, রোল গার্ড)
- **ফেজ ২:** B2C স্টোরফ্রন্ট (হোম, ক্যাটাগরি, সার্চ, কার্ট, চেকআউট, COD, JSON-LD)
- **ফেজ ৩:** সেলার পোর্টাল ও অ্যাডমিন (KYC, ড্যাশবোর্ড, পণ্য CRUD, স্টক, কমিশন, audit_logs)
- **ফেজ ৪:** B2B মডিউল (TIN/BIN যাচাই, পাইকারি স্তরভিত্তিক দাম, MOQ, RFQ ফ্লো, ভ্যাট ইনভয়েস PDF)
- **ফেজ ৫:** অনলাইন পেমেন্ট, এসক্রো ও কুরিয়ার (SSLCommerz/aamarPay, আইডিমপোটেন্সি, এসক্রো লেজার, Pathao/Steadfast)
- **ফেজ ৬:** AI ফিচার (বাংলা/ইংরেজি বিবরণ জেনারেটর, স্মার্ট সার্চ, RFQ সহায়ক, সাপোর্ট চ্যাট, গ্রেসফুল ফলব্যাক)
- **ফেজ ৭:** কোয়ালিটি, পারফরম্যান্স ও লঞ্চ (Lighthouse ৯০+, WCAG AA, লোড টেস্ট, সিকিউরিটি অডিট)

---

## ১১. Do / Don't ও সিকিউরিটি নিয়ম (এজেন্টের জন্য বাধ্যতামূলক)

### অবশ্যই করবে (DO):
- প্রতিটি ফেজ শুরুর আগে এই ডকুমেন্টের সংশ্লিষ্ট অংশ ও বিদ্যমান কোড পড়ে নেবে।
- প্রতিটি ফিচারে Zod ভ্যালিডেশন, সার্ভার-সাইড অনুমতি যাচাই ও টেস্ট লিখবে।
- অর্ডার, পেমেন্ট ও এসক্রোর স্টেট পরিবর্তন ডাটাবেস ট্রানজ্যাকশনের ভেতরে করবে।
- ওয়েবহুক সিগনেচার/ভ্যালিডেশন API থেকে পুনরায় যাচাই করবে এবং idempotency নিশ্চিত করবে।
- ছবি `next/image` দিয়ে, WebP/AVIF, সঠিক width/height সহ।
- সব ইন্টারঅ্যাকটিভ এলিমেন্টে কীবোর্ড ও স্ক্রিন রিডার সাপোর্ট।
- কাজ শেষে কী করলে, কী বাকি, কোন অনুমান করলে তার সারসংক্ষেপ দেবে।
- অনিশ্চিত হলে অনুমান না করে প্রশ্ন করবে।

### কখনও করবে না (DON'T):
- সিক্রেট, API কী বা পাসওয়ার্ড কোডে, লগে বা গিটে রাখবে না।
- ক্লায়েন্ট থেকে আসা দাম, টোটাল বা রোলকে বিশ্বাস করবে না; সব সার্ভারে পুনর্গণনা।
- ডেটা বা পেমেন্ট সিস্টেমে কাঁচা SQL স্ট্রিং জোড়া দেবে না।
- Claude API বা কোনো সিক্রেট ব্রাউজার থেকে কল করবে না।
- KYC ডকুমেন্ট পাবলিক স্টোরেজে রাখবে না।
- `any`, `eval`, `dangerouslySetInnerHTML` (স্যানিটাইজ ছাড়া) ব্যবহার করবে না।
- অননুমোদিত প্যাকেজ বা অপরিচিত সোর্স থেকে কোড যোগ করবে না; প্রতিটি নতুন ডিপেন্ডেন্সির কারণ জানাবে।
- ফেল করা টেস্ট মুছে বা স্কিপ করে "পাস" দেখাবে না।
- প্রোডাকশন ডাটাবেসে ম্যানুয়ালি মাইগ্রেশন চালাবে না; শুধু CI/অনুমোদিত প্রক্রিয়ায়।
- MLM, জুয়া, নিষিদ্ধ পণ্য ও লাইসেন্সবিহীন ওষুধ বিক্রির কোনো ফিচার বানাবে না (বাংলাদেশের ডিজিটাল কমার্স নির্দেশিকা অনুযায়ী)।
