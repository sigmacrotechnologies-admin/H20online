# H2O Online — Requirements Capture Document

**Document type:** Business Analysis & Functional Requirements  
**Product:** H2O Online Platform  
**Version:** 1.0  
**Purpose:** Comprehensive feature and requirement reference for stakeholders, business analysts, and product owners

---

## 1. Executive Summary

H2O Online is a **multi-sided water delivery ecosystem** connecting households and businesses with verified water suppliers and delivery partners through a mobile application, supported by a central **admin operations portal**.

The platform enables customers to discover water products, place one-time or scheduled orders, subscribe to recurring delivery plans, track deliveries in real time, manage payments through an integrated wallet, log daily hydration, and receive AI-powered wellness insights. Suppliers manage catalogues, accept orders, assign riders, and view earnings. Delivery partners fulfil instant orders and subscription routes. Administrators verify partners, manage subscriptions, oversee finances, and handle support across all user types.

**Strategic positioning:** Beyond transactional water delivery — the product combines **convenience**, **subscription retention**, **wallet-based payments**, and **health engagement** (hydration tracking + AI) to build long-term customer relationships.

---

## 2. Business Objectives

| ID | Objective | Success indicator |
|----|-----------|-------------------|
| BO-01 | Enable on-demand and scheduled water ordering for end customers | Customers complete order-to-delivery journey in-app |
| BO-02 | Drive recurring revenue through subscription plans | Active subscriptions with paid monthly bills |
| BO-03 | Onboard and verify water suppliers and delivery partners at scale | Verified partners transacting on platform |
| BO-04 | Provide transparent platform economics for suppliers and delivery partners | Partners view earnings, commission, and wallet history |
| BO-05 | Centralise operations through admin portal | Admin manages users, orders, subscriptions, support, finances |
| BO-06 | Increase customer engagement beyond ordering | Hydration tracking and AI insights used regularly |
| BO-07 | Build trust through verification and support | Document verification before partner go-live; ticket/chat support |

---

## 3. Stakeholders & User Personas

### 3.1 Primary personas

| Persona | Channel | Status | Primary need |
|---------|---------|--------|--------------|
| **Customer** | Mobile app | Live | Order water, subscribe, track, pay, manage account |
| **Supplier (Water vendor)** | Mobile app | Live | Sell water, fulfil orders, manage products & earnings |
| **Delivery partner** | Mobile app | Live | Pick up and deliver orders; subscription routes |
| **Master administrator** | Admin web portal | Live | Full platform control |
| **Administrator** | Admin web portal | Live | Operations with same powers as master (except master account changes) |
| **Sub-administrator** | Admin web portal | Live | Day-to-day ops without financials, destructive actions, or admin creation |

### 3.2 Future / demo personas

| Persona | Channel | Status | Notes |
|---------|---------|--------|-------|
| **Corporate buyer** | Mobile app | Demo UI only | Bulk office supply, analytics, invoicing (sample data) |
| **Restaurant** | Mobile app | Coming soon | Hospitality water solutions |
| **Event organisation** | Mobile app | Coming soon | Large-volume event supply |
| **Institute / College** | Mobile app | Coming soon | Campus water monitoring and supply |

### 3.3 Customer segments (platform vision)

Corporate, Organisation, Institute, College — reflected in wallet segmentation and future role expansion.

---

## 4. Scope

### 4.1 In scope (current release)

- Customer mobile journey: registration, ordering, subscriptions, billing, tracking, hydration, profile, support
- Supplier mobile journey: onboarding, verification, catalog, order acceptance, rider assignment, financials, wallet, support
- Delivery partner mobile journey: onboarding, verification, order fulfilment, subscription routes, earnings, support
- Admin portal: user management, orders, supplier/partner verification, plans & rates, subscription delivery assignment, wallet management, financials, support channels
- Cross-cutting: H2 Wallet, subscription billing, Water AI Sense, product reviews, privacy policy

### 4.2 Out of scope / partial (documented gaps)

- Live Corporate, Restaurant, Event, Institute commercial flows (Corporate exists as demo only)
- Full loyalty points earn/redeem programme (display only today)
- Coupon discount engine (UI present; rules not implemented)
- OTP login as production-grade authentication (mock flow)
- Live map tracking on order screen (placeholder)
- Connected wearables integration (presentation UI)
- Payment gateway integration for UPI/card (wallet is primary integrated path; other methods are customer-facing options)

---

## 5. Functional Requirements — Entry & Authentication

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-AUTH-01 | User shall select role on welcome screen: Customer, Partner, Corporate, Restaurant, Event Org, Institute | Must |
| FR-AUTH-02 | Customer shall register with name, email, phone, password, age, gender, activity level, family size | Must |
| FR-AUTH-03 | Customer shall upload profile photo and select starter plan during registration | Should |
| FR-AUTH-04 | Customer shall set daily hydration goal during registration | Should |
| FR-AUTH-05 | User shall accept terms and conditions before account activation or login | Must |
| FR-AUTH-06 | User shall log in with email and password with role validation | Must |
| FR-AUTH-07 | User shall recover password via registered email | Must |
| FR-AUTH-08 | User shall optionally log in via OTP (one-time code) | Could |
| FR-AUTH-09 | User shall log out securely from profile | Must |
| FR-AUTH-10 | Supplier shall complete business registration: business name, contact, address, GST, bank details | Must |
| FR-AUTH-11 | Supplier shall upload ID proof, business license, address proof | Must |
| FR-AUTH-12 | Delivery partner shall register with vehicle type and identity documentation | Must |
| FR-AUTH-13 | New supplier/partner shall receive verification pending status until admin approval | Must |
| FR-AUTH-14 | Supplier shall receive 6-digit onboarding verification code after registration | Should |

---

## 6. Functional Requirements — Customer App

### 6.1 Home dashboard

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-CUS-01 | Customer shall see personalised greeting with name and profile photo | Must |
| FR-CUS-02 | Customer shall view H2 Wallet balance and reward points at a glance | Must |
| FR-CUS-03 | Customer shall access quick actions: Order Jar, My Plan, Track, Wallet, Water Intake, Billing | Must |
| FR-CUS-04 | Customer shall see banner for ongoing order with status and link to tracking | Must |
| FR-CUS-05 | Customer shall view weekly hydration graph and today's goal progress | Must |
| FR-CUS-06 | Customer shall view and manage active subscriptions from dashboard | Must |
| FR-CUS-07 | Customer shall receive Water AI Sense hydration insights (expandable) | Should |
| FR-CUS-08 | Customer shall open AI health report and Ask AI from dashboard | Should |
| FR-CUS-09 | Customer shall view connected devices section (watch, smart bottle, TV hub) | Could |

### 6.2 Browse, cart & checkout

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-CUS-10 | Customer shall browse water product catalogue (jars, bottles, dispensers, tankers, bulk) | Must |
| FR-CUS-11 | Customer shall filter products by price, fastest delivery, top rated, nearest supplier | Must |
| FR-CUS-12 | Customer shall filter by size range (1–5 L through 20+ L), bulk, tanker | Must |
| FR-CUS-13 | Customer shall filter by use case: party/function, office | Should |
| FR-CUS-14 | Customer shall view product ratings and customer reviews | Must |
| FR-CUS-15 | Customer shall compare products side by side | Should |
| FR-CUS-16 | Customer shall add products to cart or buy instantly | Must |
| FR-CUS-17 | Customer shall manage cart quantities, remove items, view subtotal | Must |
| FR-CUS-18 | Customer shall enter or select delivery address at checkout | Must |
| FR-CUS-19 | Customer shall choose instant delivery or schedule date/time (within 7 days) | Must |
| FR-CUS-20 | Customer shall order for someone else with receiver name and phone | Should |
| FR-CUS-21 | Customer shall apply coupon code at checkout | Could |
| FR-CUS-22 | Customer shall access wallet top-up from checkout | Should |

### 6.3 Payment & order fulfilment visibility

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-CUS-23 | Customer shall pay via H2 Wallet, UPI, card, or cash on delivery | Must |
| FR-CUS-24 | Customer shall receive order confirmation with order ID | Must |
| FR-CUS-25 | Customer shall track order through status timeline: accepted → picked up → out for delivery → delivered | Must |
| FR-CUS-26 | Customer shall view ETA, supplier info, delivery partner info, and call driver | Must |
| FR-CUS-27 | Customer shall view order history with status filters | Must |
| FR-CUS-28 | Customer shall rate and review delivered products | Must |
| FR-CUS-29 | Customer shall reorder or shop again from order history | Should |

### 6.4 Addresses & account

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-CUS-30 | Customer shall save multiple delivery addresses (home, office, etc.) | Must |
| FR-CUS-31 | Customer shall add, edit, delete addresses with full address and PIN | Must |
| FR-CUS-32 | Customer shall set default delivery address | Must |
| FR-CUS-33 | Customer shall edit personal information (name, email, phone) | Must |
| FR-CUS-34 | Customer shall manage payment methods (cards, UPI, wallet) | Should |
| FR-CUS-35 | Customer shall change password | Must |
| FR-CUS-36 | Customer shall view order count, loyalty points, wallet in profile | Must |

### 6.5 Subscriptions & billing

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-CUS-37 | Customer shall choose subscription plan: Basic, Family, Active, Premium | Must |
| FR-CUS-38 | Customer shall set frequency: daily, weekly, monthly with date selection | Must |
| FR-CUS-39 | Customer shall set preferred delivery time window | Must |
| FR-CUS-40 | Customer shall select product and quantity within plan | Must |
| FR-CUS-41 | Customer shall assign delivery address to subscription | Must |
| FR-CUS-42 | Customer shall create and cancel subscriptions | Must |
| FR-CUS-43 | Customer shall view monthly subscription bills (pending, paid, overdue) | Must |
| FR-CUS-44 | Customer shall pay subscription bills from H2 Wallet | Must |

### 6.6 Hydration & wellness

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-CUS-45 | Customer shall log water intake by glass, jar, bottle, or custom volume | Must |
| FR-CUS-46 | Customer shall track progress toward daily hydration goal | Must |
| FR-CUS-47 | Customer shall view 7-day consumption graph | Must |
| FR-CUS-48 | Customer shall receive suggested intake based on profile and activity | Should |
| FR-CUS-49 | AI insights shall include non-medical disclaimer | Must |

### 6.7 Support & compliance

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-CUS-50 | Customer shall create support ticket with category, subject, description | Must |
| FR-CUS-51 | Customer shall view ticket status: Open, In Progress, Resolved, Closed | Must |
| FR-CUS-52 | Customer shall reply on ticket thread | Must |
| FR-CUS-53 | Customer shall read in-app privacy policy | Must |

---

## 7. Functional Requirements — Supplier App

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-SUP-01 | Supplier shall view dashboard with today's earnings and delivery count | Must |
| FR-SUP-02 | Supplier shall receive alert for pending incoming orders | Must |
| FR-SUP-03 | Supplier shall view incoming orders filtered by instant/scheduled | Must |
| FR-SUP-04 | Supplier shall accept order with ETA, remarks, fleet type | Must |
| FR-SUP-05 | Supplier shall reject or cancel orders | Must |
| FR-SUP-06 | Supplier shall assign or change delivery partner on accepted orders | Must |
| FR-SUP-07 | Supplier shall view order history (delivered, in progress, cancelled) | Must |
| FR-SUP-08 | Supplier shall manage product catalogue: add, edit price/stock/delivery time, remove | Must |
| FR-SUP-09 | Supplier shall view financials: gross revenue, platform fee, net earnings | Must |
| FR-SUP-10 | Supplier shall view wallet balance and transaction history | Must |
| FR-SUP-11 | Supplier shall chat with admin support team | Must |
| FR-SUP-12 | Supplier shall not access dashboard until admin verifies documents | Must |

---

## 8. Functional Requirements — Delivery Partner App

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-DEL-01 | Delivery partner shall view dashboard with incoming and subscription badges | Must |
| FR-DEL-02 | Partner shall view assigned instant and scheduled orders | Must |
| FR-DEL-03 | Partner shall mark order as picked up | Must |
| FR-DEL-04 | Partner shall mark order as delivered | Must |
| FR-DEL-05 | Partner shall view subscription delivery routes assigned by admin | Must |
| FR-DEL-06 | Partner shall filter subscription orders by today, this week, time range | Should |
| FR-DEL-07 | Partner shall view completed delivery history with earnings | Must |
| FR-DEL-08 | Partner shall view summary stats: total, delivered, in progress, cancelled | Must |
| FR-DEL-09 | Partner shall view earnings breakdown and wallet balance | Must |
| FR-DEL-10 | Partner shall redeem earnings from wallet | Must |
| FR-DEL-11 | Partner shall update profile: name, phone, vehicle, photo | Must |
| FR-DEL-12 | Partner shall chat with admin for route/delivery issues | Must |
| FR-DEL-13 | Partner shall not operate until admin verifies documents | Must |

---

## 9. Functional Requirements — Admin Portal

### 9.1 User & order management

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-ADM-01 | Admin shall search, filter, sort, and paginate users | Must |
| FR-ADM-02 | Admin shall view and edit user profile fields | Must |
| FR-ADM-03 | Admin/Master shall delete users; Sub-admin shall not | Must |
| FR-ADM-04 | Admin shall view all orders with status filters | Must |
| FR-ADM-05 | Admin shall view order detail: customer, items, total, timeline | Must |

### 9.2 Partner verification

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-ADM-06 | Admin shall review supplier verification queue (ID, address, license) | Must |
| FR-ADM-07 | Admin shall approve or reject supplier verification | Must |
| FR-ADM-08 | Admin shall add supplier manually with business and bank details | Must |
| FR-ADM-09 | Admin shall set per-supplier commission percentage | Must |
| FR-ADM-10 | Admin/Master shall remove supplier; Sub-admin shall not | Must |
| FR-ADM-11 | Admin shall review and approve/reject delivery partner documents | Must |

### 9.3 Plans, subscriptions & delivery routing

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-ADM-12 | Admin shall manage plan tiers and plan product rates (daily/weekly/monthly) | Must |
| FR-ADM-13 | Admin shall add, edit, remove plan products | Must |
| FR-ADM-14 | Admin shall view subscription book with search and status filters | Must |
| FR-ADM-15 | Admin shall pause (deactivate) or manage subscription status | Must |
| FR-ADM-16 | Admin shall assign delivery partner and pickup hub per subscription | Must |
| FR-ADM-17 | Admin shall bulk-assign subscriptions by locality/PIN to one partner | Should |
| FR-ADM-18 | Admin shall edit subscription locality, PIN, preferred delivery time | Must |
| FR-ADM-19 | Admin shall view subscription financial summary | Must |

### 9.4 Wallet & financials

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-ADM-20 | Admin shall view wallets by segment: Customer, Supplier, Delivery, Corporate, etc. | Must |
| FR-ADM-21 | Admin shall adjust wallet balance (add, deduct, set) with notes | Must |
| FR-ADM-22 | Admin/Master shall view platform financials: revenue, commission, payouts, profit | Must |
| FR-ADM-23 | Sub-admin shall not access financials | Must |

### 9.5 Admin users & support

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-ADM-24 | Admin/Master shall create Admin or Sub-admin accounts | Must |
| FR-ADM-25 | Admin shall manage customer support tickets: reply, update status | Must |
| FR-ADM-26 | Admin shall respond to supplier support chat threads | Must |
| FR-ADM-27 | Admin shall respond to delivery partner support chat threads | Must |

### 9.6 Admin role matrix

| Capability | Master | Admin | Sub-admin |
|-----------|--------|-------|-----------|
| View/edit users | Yes | Yes | Yes (no delete) |
| Delete users | Yes | Yes | No |
| Manage orders | Yes | Yes | Yes |
| Add suppliers | Yes | Yes | Yes |
| Remove suppliers | Yes | Yes | No |
| Verify partners | Yes | Yes | Yes |
| Plans & rates | Yes | Yes | Yes |
| Subscription routing | Yes | Yes | Yes |
| Wallet management | Yes | Yes | Yes |
| Financials | Yes | Yes | No |
| Create admin users | Yes | Yes | No |
| All support channels | Yes | Yes | Yes |

---

## 10. Functional Requirements — Corporate Demo

| Req ID | Requirement | Priority |
|--------|-------------|----------|
| FR-COR-01 | User shall complete multi-step corporate company registration (demo) | Could |
| FR-COR-02 | User shall enter access code CORP2024 to enter Corporate Hub | Could |
| FR-COR-03 | Corporate Hub shall show company metrics, consumption graphs, bulk schedules | Could |
| FR-COR-04 | Corporate Hub shall show invoice list and order history (sample data) | Could |

*Note: Corporate is not a live commercial offering; requirements marked Could for future productisation.*

---

## 11. Cross-Cutting Business Capabilities

### 11.1 H2 Wallet

- Customers top up wallet and pay for orders and subscription bills
- Suppliers receive order payouts minus platform commission
- Delivery partners receive earnings and redeem to external payout
- Admin oversees all wallet segments and performs manual adjustments
- Platform wallet tracks aggregate transaction flow for financial reporting

### 11.2 Platform economics

- Configurable supplier commission (default ~20% platform fee)
- Supplier financials show gross revenue, platform deduction, net earnings
- Admin financials show total revenue, platform cut, partner obligations, net profit

### 11.3 Water AI Sense

- Daily personalised hydration insight on dashboard and intake tracker
- AI-generated health/hydration report with recommendations
- Natural-language Ask AI for hydration, ordering, and subscription guidance
- Context uses profile, intake logs, and app activity; includes medical disclaimer

### 11.4 Support model

| User type | Format | Categories / topics |
|-----------|--------|---------------------|
| Customer | Tickets with status lifecycle | Order, Delivery, Payment, Account, Product quality, Other |
| Supplier | Persistent chat with admin | Business, orders, verification, payouts |
| Delivery partner | Persistent chat with admin | Routes, assignments, earnings |

### 11.5 Reviews & trust

- Customers rate and review products after delivery
- Product catalogue displays aggregate ratings and review counts
- Suppliers and delivery partners verified before platform access

---

## 12. Business Workflows

### Workflow A — Customer one-time order

1. Customer browses catalogue → adds to cart
2. Checkout: address, instant or scheduled delivery, optional receiver details
3. Payment via wallet, UPI, card, or COD
4. Order confirmed; customer tracks live status
5. Supplier accepts, sets ETA, assigns delivery partner
6. Partner picks up → delivers
7. Customer rates product in order history

### Workflow B — Subscription lifecycle

1. Customer selects plan, product, frequency, dates, time window, address
2. Platform creates subscription and generates monthly bills
3. Admin assigns delivery partner and pickup hub (optional bulk by locality)
4. Delivery partner fulfils via subscription orders screen
5. Customer pays bills from wallet via Subscription Billing
6. Customer or admin may cancel/pause subscription

### Workflow C — Supplier onboarding

1. Partner registers with business details and documents
2. Receives verification code; status = pending
3. Admin reviews and approves/rejects in verification queue
4. Approved supplier accesses dashboard, manages catalog, accepts orders

### Workflow D — Delivery partner fulfilment

1. Partner registers with vehicle and documents → pending verification
2. Admin approves → partner receives assignments from supplier or admin
3. Partner updates picked up → delivered
4. Earnings credited to wallet; partner redeems via financials

### Workflow E — Customer support

1. Customer creates ticket with category and description
2. Admin responds and updates status (Open → In Progress → Resolved → Closed)
3. Customer views thread and adds replies

### Workflow F — Admin daily operations

1. Process supplier and delivery verification queues
2. Monitor orders and subscription delivery capacity
3. Adjust plans/rates and wallets as needed
4. Handle customer tickets and partner support chats
5. Review financials (restricted roles)

---

## 13. Business Rules

| Rule ID | Rule |
|---------|------|
| BR-01 | Supplier and delivery partner cannot transact until admin document verification is complete |
| BR-02 | Customer must accept terms before registration or login |
| BR-03 | Login must match selected role (Customer, Supplier, Delivery partner) |
| BR-04 | Subscription bills transition: Pending → Paid (via wallet) or Overdue |
| BR-05 | Platform commission deducted from supplier earnings before wallet credit |
| BR-06 | Admin role determines access to financials, user deletion, supplier removal, admin creation |
| BR-07 | Order cancellation limited to in-progress orders |
| BR-08 | AI outputs must display non-medical advice disclaimer |
| BR-09 | Privacy policy must be accessible from customer profile |
| BR-10 | Scheduled delivery date must be within 7 days of checkout |

---

## 14. Non-Functional Business Requirements

| Req ID | Category | Requirement |
|--------|----------|-------------|
| NFR-01 | Trust | Verification SLA communicated to partners (e.g. 24–48 hours) |
| NFR-02 | Security | Role-based access enforced on mobile and admin |
| NFR-03 | Privacy | Privacy policy defines data collection, sharing with suppliers for fulfilment, and user rights |
| NFR-04 | Payments | Card details not stored on platform (stated in privacy policy) |
| NFR-05 | Operations | Real-time order status updates visible to customer tracking |
| NFR-06 | Scalability | Admin bulk subscription assignment supports geographic routing |
| NFR-07 | Engagement | Hydration and AI features support retention beyond pure delivery |
| NFR-08 | Support | Ticket and chat channels refresh for timely admin response |
| NFR-09 | Transparency | Suppliers see platform fee vs net earnings clearly |
| NFR-10 | Compliance | Children's privacy addressed in privacy policy |

---

## 15. Assumptions & Constraints

**Assumptions**
- Customers have smartphone with internet for mobile app usage
- Suppliers and delivery partners provide valid identity and business documents
- Admin team available to process verification and support queues
- MongoDB-backed data store available for all transactional data
- Groq API available for AI features (optional for core ordering)

**Constraints**
- Corporate, Restaurant, Event, Institute roles not commercially live
- HTTP cleartext allowed on mobile for current deployment model
- Master admin uses fixed credentials (not database-managed)
- Wallet is primary integrated payment path; UPI/card/COD are customer-facing options

---

## 16. Future Scope & Product Backlog

| Item | Description | Priority |
|------|-------------|----------|
| BL-01 | Live Corporate B2B ordering and invoicing | High |
| BL-02 | Restaurant, Event, Institute role launch | Medium |
| BL-03 | Loyalty points earn and redeem programme | Medium |
| BL-04 | Coupon and promotion engine | Medium |
| BL-05 | Production OTP/SMS authentication | High |
| BL-06 | Live map tracking on order screen | Medium |
| BL-07 | Wearable and smart bottle integrations | Low |
| BL-08 | Payment gateway for UPI and cards | High |
| BL-09 | Push notifications for order and delivery updates | High |
| BL-10 | Multi-language support | Low |

---

## 17. Glossary

| Term | Definition |
|------|------------|
| **H2 Wallet** | In-app digital wallet for customers, suppliers, and delivery partners |
| **Water AI Sense** | AI-powered hydration insights, reports, and Q&A |
| **Subscription plan** | Recurring water delivery package (Basic, Family, Active, Premium) |
| **Platform commission** | Percentage retained by H2O Online from supplier order revenue |
| **Pickup hub** | Admin-defined location for delivery partner order collection |
| **Instant order** | One-time order for immediate or near-term delivery |
| **Scheduled order** | One-time order for a future date and time |
| **Verification queue** | Admin list of pending supplier/partner document approvals |
| **Master admin** | Fixed super-user with full portal access |

---

## 18. Document Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Business Analyst | | | |
| Project Sponsor | | | |
| Technical Lead | | | |

---

*This document captures functional and business requirements derived from the H2O Online product as implemented across the customer mobile app, supplier app, delivery partner app, and admin portal.*
