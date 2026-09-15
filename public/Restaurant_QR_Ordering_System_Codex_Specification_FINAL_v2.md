**SINGLE-RESTAURANT QR ORDERING SYSTEM  
Complete Functional Specification & Codex Implementation Handoff**

_Authoritative specification for completing the existing Lovable-generated local project._

# 1\. Implementation Directive

Treat this document as the functional source of truth. The existing project was generated in Lovable and is now local. Codex must inspect the existing codebase first, preserve good existing work, and implement or fix everything required here. Do not rebuild working parts unnecessarily and do not add excluded features.

- One restaurant only; NOT SaaS or multi-tenant.
- No customer accounts and no customer PII.
- Call Waiter IS included in this final version; see the dedicated Call Waiter specification.
- No online payment gateway in this version.
- Owner/Admin is the only authenticated role required.
- Customer UI must be premium; Admin UI must be fast and operational.
- Fully responsive on mobile, tablet and desktop.
- Create/use .env.example only; never create a real .env or hardcode secrets.
- If migrations are required, create safe migration files. The developer will run migrations manually.

# 2\. Product Definition

Each physical table has a permanent QR code. The QR identifies the table, not an order. A customer scans it, browses the digital menu, views food media, adds items, and confirms an order. The system associates the order with that table's active session. Later purchases become separate order batches inside the same session. Admin sees all submitted orders in FCFS order, manages status, sees the running bill, and finally checks out/closes the table. Closed sessions remain in Audit History. The same physical QR can then start a completely new session for the next customer.

# 3\. Explicitly Out of Scope

- Multi-restaurant/SaaS/tenant architecture, restaurant registration/onboarding, subscriptions.
- Customer registration/login/profile/loyalty/CRM/reviews.
- Customer name, email, phone, address, password or identity collection.
- Call Waiter is included.
- Delivery, reservations, inventory, procurement, supplier management, payroll.
- Online payment gateway processing.
- Complex accounting/GST accounting.
- Multi-branch management.
- Unnecessary analytics or unrelated modules.

# 4\. Roles

## 4.1 Customer

- Public access through a table QR/deep link; no login.
- Browse menu, categories and item details/media.
- Use cart, confirm orders and see active-session order status/running total.
- Order more while the session remains active.
- Never see another table's session or closed audit records.

## 4.2 Owner/Admin

- Authenticated access only.
- Dashboard, Orders, Tables, Menu/Categories, Audit History and Settings.
- Manage menu, media, availability, tables and QR codes.
- Manage order statuses, running bills and checkout.
- Review closed sessions.

# 5\. Customer Flow

## 5.1 QR Entry

1. Customer scans the permanent QR physically attached to the table.
2. QR opens the menu for that table.
3. The table is identified securely; never ask the customer to type the table number.
4. Invalid/tampered QR must show a polished error state without exposing technical details.

## 5.2 Session Detection

1. If the table is AVAILABLE/no active session: the first confirmed order creates the session.
2. If the table is ACTIVE: reuse the existing active session.
3. Rescanning the QR must NOT create a new session.
4. Serving an order must NOT make the table available.

## 5.3 Menu

- Premium mobile-first restaurant interface.
- Brand header and restaurant identity.
- Category navigation.
- Item cards with image, name, price, description and configured tags.
- Optional search is acceptable if useful.
- Unavailable items remain visible but cannot be added/submitted.
- Optimize/lazy-load media.

## 5.4 Item Details

- Large primary image and swipeable item-specific gallery.
- Name, price, description, tags and availability.
- Optional Instagram Reel/video link.
- Hide the video section when no video is configured.
- Quantity control and Add to Cart.
- Never use a generic restaurant gallery as the item's gallery.

## 5.5 Cart

- Show item, image, quantity, unit price, subtotal and grand total.
- Increase/decrease quantity and remove items.
- Show total item count.
- Mobile-friendly sticky cart access.
- Revalidate availability server-side at submission.

## 5.6 Confirm Order

1. Server validates table/session and cart items.
2. If no active session exists, atomically create the session and first order batch.
3. If a session exists, create a new order batch inside it.
4. Snapshot item name and price at order time.
5. Use server-side timestamp and/or sequence for FCFS.
6. Return clear confirmation such as: Order #1047-1 | Table 07 | 8:12 PM.
7. Never request customer identity.

## 5.7 Active Session / Order More

- Show current order batches, statuses and running total.
- Provide Order More / Order Again.
- Additional purchases become new order batches under the SAME session.
- Do not mutate the original order merely to append later purchases.

# 6\. Table Session Model

```
TABLE AVAILABLE
      ↓
FIRST CONFIRMED ORDER
      ↓
ACTIVE TABLE SESSION
      ↓
ORDER BATCH #1
      ↓
ORDER BATCH #2 / #3 / ...
      ↓
ORDERS MAY ALL BE SERVED
      ↓
TABLE STILL ACTIVE
      ↓
OWNER CHECKOUT & CLOSE
      ↓
FINAL BILL
      ↓
AUDIT HISTORY
      ↓
TABLE AVAILABLE AGAIN
```

Critical rule: table availability is controlled by the active session, not individual order status. A table stays ACTIVE until Admin explicitly checks out and closes the session.

# 7\. Order Batch Model

```
SESSION #1047 — TABLE 07
  ├── ORDER #1047-1 — 8:12 PM
  │     ├── Chicken Biryani × 2
  │     ├── Butter Chicken × 1
  │     └── Water × 2
  ├── ORDER #1047-2 — 8:45 PM
  │     └── Coke × 2
  └── ORDER #1047-3 — 9:05 PM
        └── Gulab Jamun × 1
```

- Each batch has its own server timestamp and status.
- Every batch belongs to exactly one session.
- Item name and price snapshots preserve historical correctness.
- Do not overwrite or silently merge previous batches.

# 8\. FCFS Order Queue — Mandatory

Admin must see submitted order batches in first-come-first-served sequence. Use server-side creation timestamps and/or a monotonic sequence; never rely only on a customer's device clock.

```
NEW ORDERS
#1047-1  TABLE 07  8:12 PM
#1048-1  TABLE 03  8:14 PM
#1049-1  TABLE 11  8:16 PM
#1050-1  TABLE 02  8:19 PM
```

- Oldest pending/new order appears first.
- A later order must not jump ahead because of its table.
- Sequence must remain correct after refresh/reconnect.
- Use a deterministic tie-breaker for near-identical timestamps.

# 9\. Order Status Lifecycle

```
NEW → ACCEPTED → PREPARING → READY → SERVED
```

- New orders must be visually prominent.
- Admin can move orders through these states.
- Timestamp and table remain visible.
- Status changes never close the table session.
- Customer can see relevant order status.

# 10\. Admin Dashboard

Design Admin as an operations console. It should answer in seconds: which tables are active, which orders need action, what is being prepared, and what each table currently owes.

- Active table count.
- Available table count.
- New/pending order count.
- Preparing/Ready order counts.
- Active table cards with current totals.
- Prominent FCFS order queue.

## 10.1 Table Card

```
TABLE 07
ACTIVE
Session #1047
3 Orders
5 Items
Running Bill ₹940
```

## 10.2 Table Detail

```
TABLE 07
Session #1047
Started: 8:12 PM
Current Bill: ₹1,060

Order #1047-1 — 8:12 PM — SERVED
Order #1047-2 — 8:45 PM — PREPARING
Order #1047-3 — 9:05 PM — NEW

Running Total: ₹1,060
[CHECKOUT & CLOSE]
```

# 11\. Running Bill and Checkout

## 11.1 Running Bill

Running total = sum of all valid order item subtotals in the active session.

```
Chicken Biryani ×2 = ₹480
Butter Chicken ×1 = ₹320
Water ×2 = ₹40
Coke ×2 = ₹100
-------------------
Running Total = ₹940
```

## 11.2 Price Snapshot

- Store unit price at order time.
- Old orders never recalculate using the current menu price.
- Example: ordered at ₹240; later menu changes to ₹280; historical order remains ₹240.

## 11.3 Checkout

1. Owner confirms customer is finished and payment has been received.
2. Admin selects Checkout & Close.
3. Show final bill containing every batch in the session.
4. Optionally record Cash, UPI, Card or Other.
5. Do not process the payment.
6. Finalize session, record close time and final total.
7. Move session to Audit History.
8. Make the table AVAILABLE.

# 12\. Audit History

- Every closed session remains available to Admin.
- Default list can be newest closed sessions first.
- Opening a record shows table, session ID, start/end time, duration, every order batch, timestamps, items, quantities, snapshots, final total and optional payment method.
- Audit History is operational history, NOT customer history.
- Customers must never access it.

# 13\. Privacy

No customer identity system exists. Do not collect or persist customer name, email, phone, address, password, profile, loyalty information or other customer PII. Store only operational restaurant data required for the table/session/order workflow.

- Allowed: table, session ID, order IDs, timestamps, statuses, item/quantity/price snapshots, totals and optional payment method.
- Do not add tracking designed to identify individual customers.

# 14\. Menu Administration

## 14.1 Categories

- Create
- Edit
- Delete safely
- Reorder
- Enable/disable

## 14.2 Items

- Create/edit/delete.
- Category assignment.
- Name, description and price.
- Availability.
- Display order.
- Tags.
- Multiple images.
- Optional Reel/video URL.

## 14.3 Availability

- Unavailable items remain in the menu but cannot be added or submitted. Server must revalidate availability.

## 14.4 Media

- Upload/replace/delete images
- Reorder images
- First image is primary
- Optional item-specific video/Reel URL
- Broken/missing media must not break the page

# 15\. Table & QR Management

- Admin can add/remove tables.
- Admin can view table number and status.
- Admin can generate/view each table QR.
- QR output must be suitable for printing.
- QR remains associated with the physical table.
- Use a secure unique QR token mapped to the table record.
- Do not trust arbitrary client table IDs for authorization.
- If regeneration exists, it must be intentional.

# 16\. Authentication & Security

- Use the selected initial approach: simple seeded owner login with email/password.
- Protect all Admin routes and mutations.
- Never expose credentials/secrets client-side.
- Hash passwords appropriately if local auth is implemented.
- Use secure sessions/cookies appropriate to the stack.
- Validate and authorize server-side Admin mutations.
- Validate uploaded files/media URLs.
- Prevent cross-table session access through manipulated URLs/client state.
- Frontend checks are not a security boundary.

# 17\. Environment Variables

Create .env.example with all required variables. DO NOT create the real .env and DO NOT hardcode secrets.

```
DATABASE_URL=
AUTH_SECRET=
STORAGE_URL=
STORAGE_KEY=
# Add only variables actually required by the chosen implementation.
```

- Use the actual variable names required by the project.
- Ensure .gitignore excludes .env and other secret files.
- Developer will manually create .env later.

# 18\. Responsive Requirements

## Customer

- Mobile-first and intentionally designed for touch.
- Support tablet and desktop.
- No horizontal overflow.
- Sticky controls must not obscure content.
- Touch/swipe item galleries.

## Admin

- Desktop/laptop optimized for counter/management.
- Fully usable on tablet/mobile.
- Recompose rather than merely shrink the desktop dashboard.
- Order queue and table identity must remain immediately readable.

# 19\. Visual Design Direction

Use the supplied Zaytún reference image as the primary visual direction for the customer experience. It is a design reference, not a requirement to copy every pixel.

- Premium dark charcoal/near-black foundation.
- Warm gold/champagne accents.
- Elegant display/serif typography paired with a clean UI font.
- Rich food photography.
- Sophisticated cards, borders and subtle depth.
- Luxury restaurant atmosphere.
- Minimal intentional animation.
- Strong contrast and readability.
- Avoid generic Swiggy/Zomato-like design language.
- Avoid excessive gradients, glassmorphism, animation, giant hero sections and decorative clutter.
- Customer side = premium experience; Admin side = operational productivity.

# 20\. Customer Screens / States

- Welcome/Landing — restaurant branding and Explore Menu.
- Menu Categories — premium category navigation.
- Menu Items — cards, prices, tags and add controls.
- Item Details — gallery, description, optional Reel/video and add-to-cart.
- Cart — table context, items, quantities and total.
- Order Confirmation — success, table and order reference.
- Order Status — timeline/status for current batches.
- Active Session / Running Bill — current total and Order More.
- Menu Drawer — Menu, Orders and configured informational sections.
- Thank You / Closing — polished post-session state where appropriate.

# 21\. Admin Screens / States

- Login.
- Dashboard.
- FCFS Orders queue.
- Order detail/status controls.
- Active Tables.
- Table session detail/running bill.
- Checkout/final bill.
- Audit History.
- Categories manager.
- Menu items manager.
- Item media manager.
- Tables/QR manager.
- Settings/restaurant branding.

# 22\. Data Model Guidance

Adapt to the existing database/stack. The schema must support these concepts:

```
RestaurantConfig
  single restaurant configuration: name, logo, branding, address, hours, social links

Table
  id, table_number/name, qr_token, status

Category
  id, name, display_order, active

MenuItem
  id, category_id, name, description, price, available, display_order, tags

MenuMedia
  id, menu_item_id, type, url, display_order

TableSession
  id, table_id, started_at, closed_at, status

OrderBatch
  id, session_id, table_id, sequence, created_at, status

OrderItem
  id, order_id, menu_item_id (nullable if later deleted),
  item_name_snapshot, unit_price_snapshot, quantity, subtotal

SessionClosure/Bill
  session_id, final_total, payment_method, closed_at
```

# 23\. Concurrency & Integrity

- At most one ACTIVE session per table.
- First session/order creation must be atomic.
- Two simultaneous first orders cannot create two active sessions.
- Additional orders attach to the one existing active session.
- Checkout cannot close an already-closed session.
- Order against a closed session must fail safely and not resurrect it.
- Use database constraints/transactions where appropriate.

# 24\. Real-Time / Refresh Behavior

- Admin should receive new orders promptly without a full manual refresh where practical.
- Additional orders should update running totals promptly.
- Status changes should propagate to the customer active-order view where appropriate.
- If true realtime is not already available, use simple reliable polling/revalidation rather than unnecessary infrastructure.
- Browser refresh must preserve server state and never duplicate orders.

# 25\. Error / Loading / Empty States

## Customer

- Invalid QR
- Menu loading
- Empty category
- Unavailable item
- Empty cart
- Submitting
- Submission failure
- Session closed while browsing
- Missing image
- Broken Reel/video

## Admin

- Login failure
- No active tables
- No new orders
- No audit history
- Empty menu/category
- Failed save/upload/delete
- Checkout failure
- Stale session/order state

All customer-facing errors must be human-readable. Never expose raw stack traces/database errors.

# 26\. Performance & Accessibility

- Optimize and lazy-load food images.
- Do not preload every high-resolution image/video.
- Efficient database queries and indexes for active sessions, open orders, timestamps and audit history.
- Fast on ordinary mobile networks.
- Semantic HTML and accessible labels.
- Good contrast, focus states and touch targets.
- Alt text for food images.
- Do not communicate important status by color alone.

# 27\. Seed / Demo Data

Use the Zaytún restaurant concept shown in the supplied reference as demo branding. Use realistic INR sample prices and food imagery so the app is immediately demonstrable. Seeded content must remain editable through Admin and must not be hardcoded into the UI.

- Suggested categories: Starters, Main Course, Biryani, Grill & BBQ, Arabic Specials, Desserts, Beverages.
- Suggested items: Chicken Biryani, Mutton Biryani, Special Biryani, Veg Biryani, Coke, Gulab Jamun, etc.
- Admin must be able to replace seeded images and content.

# 28\. Exact End-to-End Acceptance Test

1. Table 07 starts AVAILABLE.
2. Customer scans Table 07 QR.
3. Customer browses categories and opens an item.
4. Customer can view item-specific gallery and optional Reel/video.
5. Customer adds Chicken Biryani ×2 and Water ×2.
6. Customer confirms without entering name/phone/email.
7. System creates Session #1001 and Order #1001-1 for Table 07.
8. Table 07 becomes ACTIVE.
9. Admin sees the order in correct FCFS position.
10. Admin moves order NEW → ACCEPTED → PREPARING → READY → SERVED.
11. Customer sees the relevant status.
12. Customer scans the same QR again while session is active.
13. System reuses Session #1001.
14. Customer orders Coke ×2.
15. System creates Order #1001-2 under Session #1001.
16. Admin sees it after earlier submitted orders according to server sequence.
17. Running bill updates.
18. Customer orders dessert later; another batch is created in the same session.
19. Admin sees all batches, timestamps and correct total.
20. Owner receives payment manually.
21. Admin selects Checkout & Close.
22. Final bill includes all items using price snapshots.
23. Session #1001 is closed and appears in Audit History.
24. Table 07 becomes AVAILABLE.
25. A different customer scans the same physical QR.
26. The next confirmed order creates Session #1002.
27. Session #1002 has no data from Session #1001.
28. Audit History still contains Session #1001.

# 29\. Additional Edge-Case Tests

- Two simultaneous first orders at an available table: only one active session exists; valid batches attach to it.
- Item becomes unavailable just before submission: server rejects that item safely.
- Admin changes price after an earlier order: earlier order retains old snapshot price.
- Admin closes a session while a customer is viewing it: later submission fails safely and does not resurrect the session.
- Customer refreshes after ordering: existing order remains and is not duplicated.
- Admin refreshes: FCFS ordering and totals remain correct.
- Tampered table URL/token cannot expose another table's active session.
- Deleting a menu item does not destroy historical item name/price snapshots.
- Broken image/Reel does not break item page.
- No customer PII is present in schema/API.

# 30\. Codex Implementation Workflow

1. Inspect the complete repository before changing anything: framework, package manager, routes, database, auth, storage, current features and configuration.
2. Run the project locally and inspect every existing screen/route.
3. Compare the implementation against this specification and the supplied Zaytún reference.
4. Create an internal gap list of missing/broken functionality, business logic, schema/migration, responsiveness and visual issues.
5. Preserve good existing components and patterns.
6. Implement/fix database schema and migrations for sessions, batches, snapshots, bills and audit history.
7. Implement/fix seeded owner authentication and protected Admin routes.
8. Implement/fix table + secure QR identification.
9. Implement/fix customer menu, item details/media, cart and order submission.
10. Implement/fix active Table Session logic and concurrency safeguards.
11. Implement/fix FCFS Admin queue.
12. Implement/fix order status lifecycle.
13. Implement/fix running bill and checkout.
14. Implement/fix Audit History.
15. Implement/fix menu/category/media/table administration.
16. Polish responsive layouts against the supplied visual reference.
17. Add loading, empty and error states.
18. Review security and environment handling.
19. Run available lint/type/build/test checks.
20. Execute the acceptance tests in this document.
21. At completion, report what was already present, what was changed, migration commands, required .env variables and any genuine remaining blocker.

# 31\. Migration & Deployment Handoff

Inspect the existing migration system and database state before creating migrations. Do not use destructive resets or silently destroy data. If schema changes are required, create the appropriate migration files.

- State exactly which migration command(s) the developer must run.
- State exactly which environment variables must be added to the manually-created .env.
- Verify .env.example is complete.
- Verify .gitignore excludes .env.
- Do not commit or create a real .env.
- After environment variables and migrations are supplied, the application should be ready for normal hosting/deployment.

# 32\. Definition of Done

- Permanent table QR works.
- Premium responsive customer menu works.
- Item-specific galleries work.
- Optional Reel/video works gracefully.
- Cart and order confirmation work without customer account.
- First order creates active session.
- Additional orders reuse active session.
- Additional orders are separate batches.
- FCFS sequence is server-driven and correct.
- Order statuses work.
- Running bill updates correctly.
- Historical price snapshots are correct.
- Table remains ACTIVE until Admin checkout/close.
- Checkout/final bill works without online payment processing.
- Closed sessions remain in Audit History.
- Closed table becomes AVAILABLE.
- Same QR creates a new session for the next customer.
- No customer PII/account/history is created.
- Admin authentication and protected routes work.
- Menu/category/media management works.
- Table/QR management works.
- Responsive customer and Admin experiences work.
- .env.example is complete and no real .env is created.
- No excluded feature has been added.
- End-to-end and edge-case tests pass.

# 33\. Final Instruction to Codex

Do not treat this as a mockup request or partial prototype. Treat it as the completion specification for the existing application. Inspect first, then implement every missing requirement, correct incorrect business logic, preserve useful existing work, and verify the complete system end-to-end. Adapt to the existing stack rather than replacing it unnecessarily. Do not add features explicitly excluded above. When finished, provide a concise implementation report, migration commands, required environment variables and any remaining production blocker.

# FINAL REVISION — QR, MENU, WAITER CALL & ADMIN CLARIFICATIONS

This section is authoritative and supersedes any earlier conflicting wording. It incorporates the latest agreed product behavior.

# 1\. Public Customer Website

- The public site is the customer/menu experience only.
- No visible Admin button, Staff Login, Owner Login, Dashboard link or Admin navigation.
- No public-facing staff/admin entry page.
- Owner accesses Admin directly through a protected route such as /admin.
- The customer menu is public through the QR/deep link and requires no customer login.
- Every table QR opens the same central menu/application; only the secure table context changes.

# 2\. Permanent QR Per Physical Table

```
Table 01 → QR #T01
Table 02 → QR #T02
Table 03 → QR #T03
...
Table 20 → QR #T20
```

- Each physical table has a permanent QR identity.
- The QR identifies the table, NOT an order and NOT a customer.
- All table QRs open the same central restaurant menu/application.
- The route may resemble /menu/T01, but backend logic must use a secure token mapped to the table rather than trusting a raw user-editable number.
- Scanning a QR does not create an order or session by itself.
- The first confirmed order creates the session if the table is available.
- Rescanning an active table QR reuses the existing active session.
- Generating/downloading/sharing a QR never creates a session.

# 3\. Admin QR Generator / Recovery

```
ADMIN → TABLES → QR CODES

Table Number: 07
[ GENERATE QR ]

QR PREVIEW
TABLE 07

[ DOWNLOAD ]  [ SHARE ]
```

- Admin can enter/select a table number and generate/retrieve that table's QR.
- If a physical QR is lost, damaged or misplaced, Admin can return to the QR section and retrieve/generate the QR for the required table.
- The QR resolves to the same table identity and central menu.
- Provide high-quality QR preview, download and device/browser share where supported.
- Use a graceful fallback when native sharing is unavailable.
- Ordinary QR retrieval must not rotate the table's identity.
- If token rotation is supported, it must be an explicit action that invalidates the old token intentionally.
- QR output must be practical for printing and physical placement on tables.

# 4\. Required Customer Menu Content

- Dynamic categories: Starters, Main Course, Biryani, Chinese, Burgers, Beverages, Desserts, etc.
- Food name, price and description.
- Multiple photos and item-specific gallery.
- Optional Instagram Reel/video link.
- Veg/Non-Veg indicator.
- Optional tags such as Bestseller, Spicy, New, Popular and Chef's Special.
- Available/Unavailable state.
- Add to Cart.
- Clicking an item opens its own gallery/details; never substitute a generic restaurant gallery.
- Seeded images/content can later be replaced by Admin.

# 5\. Cart → Confirm Order

```
Customer scans Table 07 QR
↓
Central menu
↓
Browse categories/items
↓
Open item gallery/details
↓
Chicken Biryani ×2
Butter Chicken ×1
Coke ×2
↓
Cart → Confirm Order
↓
System knows: single restaurant + Table 07 + active/new Session + new Order Batch
↓
Admin receives order
```

- Never ask the customer to manually enter the table number.
- Never ask for customer name, phone, email or other identity.
- Attach table context automatically from the QR.
- Use server timestamp/sequence for FCFS.
- Snapshot item name and price at order time.
- Show clear confirmation.

# 6\. Admin Dashboard / Table View

```
RESTAURANT ADMIN

TABLE 01     TABLE 02     TABLE 03
AVAILABLE    ACTIVE       AVAILABLE

TABLE 04     TABLE 05     TABLE 06
ACTIVE       ACTIVE       AVAILABLE

TABLE 05
Session #1047

Chicken Biryani ×2   ₹480
Butter Chicken  ×1   ₹320
Coke            ×2   ₹100
--------------------------
Running Total        ₹900
```

- Admin immediately sees which table ordered.
- Active and available tables are visually distinct.
- Table cards may show current total, order count and item count.
- Opening a table shows its complete active session and all order batches chronologically.

# 7\. FCFS Order Queue

```
NEW ORDERS

#1047-1   TABLE 07   8:12 PM
#1048-1   TABLE 03   8:14 PM
#1049-1   TABLE 11   8:16 PM
#1050-1   TABLE 02   8:19 PM
```

- Submitted order batches are processed first-come-first-served.
- Oldest pending order appears first.
- Additional orders enter the queue according to their own server submission time.
- A later order cannot jump ahead because of its table.
- Use server timestamp plus deterministic sequence/tie-breaker.
- Order sequence remains correct after refresh/reconnect.

# 8\. Order Status

```
NEW → ACCEPTED → PREPARING → READY → SERVED
```

- New orders expose ACCEPT.
- A REJECT action may be provided; rejected orders become a terminal REJECTED/CANCELLED state and must not silently disappear.
- Normal successful flow remains NEW → ACCEPTED → PREPARING → READY → SERVED.
- Status changes never make a table available.
- The same Admin system can provide Kitchen View; no separate kitchen application is required in V1.

# 9\. Call Waiter — INCLUDED

```
CUSTOMER MENU
                         [ 🛎 CALL WAITER ]
                         floating CTA
```

- Floating Call Waiter CTA is present on the customer menu/active-session experience.
- Tap creates a waiter-call event associated with the current table and, when available, active session.
- If no active session exists, the call may be table-level; do not create a fake order/session solely for a waiter call.
- Attempt approximately 2–3 seconds of device vibration using the browser vibration API where supported. Treat vibration as best-effort because support varies.
- Show customer feedback such as 'Waiter Called'.
- Admin receives a prominent notification containing table number and time.
- Play a notification sound for a new waiter call where browser/device permissions allow it.
- Provide Acknowledge and/or Resolved actions.
- Use a sensible cooldown/debounce to prevent rapid accidental spam.
- Waiter calls never add charges to the bill.
- Do not collect customer identity.

# 10\. Active Session + Additional Orders

```
TABLE 07
ACTIVE SESSION #1047

Order #1047-1 — 8:12 PM
  Chicken Biryani ×2
  Water ×2

Order #1047-2 — 8:45 PM
  Coke ×2

Order #1047-3 — 9:05 PM
  Gulab Jamun ×1

RUNNING BILL = ALL VALID BATCHES
```

- First confirmed order on an available table creates the active session.
- Every later confirmed order while active creates a new batch inside the SAME session.
- Rescanning the same QR never creates a new session.
- Never overwrite previous batches.
- Customer gets Order More / Order Again.
- Running bill includes every valid batch.
- Table stays ACTIVE even when all orders are SERVED.
- Only Admin Checkout & Close ends the session.

# 11\. Running Bill + Price Snapshot

- Running total updates whenever another batch is placed.
- Line subtotal = quantity × price-at-order snapshot.
- Session total = sum of all valid order item subtotals.
- Historical orders retain the price charged at order time.
- Changing a menu price later never changes old order totals.

# 12\. Owner/Admin Login

```
/admin

Owner/Admin Login
Email / Mobile
Password

[ LOGIN ]
```

- Use the agreed simple seeded owner login with email/password.
- Protect /admin and all Admin mutations.
- Do not expose /admin through public customer navigation.
- No customer authentication.
- No staff-management module is required in V1.

# 13\. Menu Administration

- Create/edit/delete safely, enable/disable and reorder categories.
- Create/edit/delete/reorder items.
- Change price, description and Veg/Non-Veg indicator.
- Add/remove tags.
- Toggle availability.
- Upload/replace/delete/reorder item photos; first image is primary.
- Add/remove Instagram Reel/video URL.
- Changes appear in the same central menu without QR reprint.
- Menu edits never invalidate table QR codes.

# 14\. Checkout → Audit → Reset

1. Admin opens active table and sees every batch and running bill.
2. Owner collects payment manually outside the application.
3. Admin selects Checkout & Close.
4. Show/finalize complete bill.
5. Optionally record Cash, UPI, Card or Other.
6. Do not implement payment gateway.
7. Record closed_at, final total and required snapshots.
8. Move session to Audit History.
9. Remove it from Active Tables.
10. Set table to AVAILABLE.
11. Same physical QR remains valid.
12. Next customer's first confirmed order creates a brand-new session.

# 15\. Audit History

- Retain session ID, table, start/end timestamps, duration, order batches, order timestamps/statuses, item/quantity/price snapshots, subtotals, final total and optional payment method.
- Waiter-call operational events may be retained as operational logs.
- Audit History is restaurant operational history, not customer history.
- Customers cannot access Audit History.
- No customer identity is stored.

# 16\. Final Data Relationships

```
SINGLE RESTAURANT
      ↓
TABLES
      ↓
TABLE SESSION (max one ACTIVE per table)
      ↓
ORDER BATCHES (FCFS sequence)
      ↓
ORDER ITEMS (name/price snapshots)
      ↓
FINAL BILL / CLOSED SESSION
      ↓
AUDIT HISTORY

MENU: Categories → Menu Items → Menu Media

WAITER CALLS: Table → optional Active Session → Call Event
```

- Enforce at most one ACTIVE session per table with a database constraint/transaction where possible.
- First-order/session creation must be atomic.
- Order items retain historical name and price snapshots.
- Deleting/editing a menu item must not corrupt historical records.
- Waiter calls are separate from order items and billing.

# 17\. Security / Environment / Migrations

- Create .env.example with only variables actually required.
- Do NOT create the real .env or hardcode secrets.
- Ensure .gitignore excludes .env.
- Admin authorization must be server-side.
- Validate QR/table tokens and prevent cross-table session exposure.
- Validate uploaded media.
- Inspect existing migrations before adding new ones.
- Do not use destructive database resets.
- Report exact migration commands and environment variables after implementation.

# 18\. Final V1 Scope

- Single restaurant only.
- Permanent table QR codes.
- Admin table-number QR generation/retrieval.
- QR preview, download and share.
- Central menu with secure table context.
- Premium mobile-first customer UI.
- Dynamic categories.
- Food details, multiple item-specific images/gallery.
- Instagram Reel/video.
- Veg/Non-Veg indicator.
- Optional tags and availability.
- Cart and order confirmation.
- Active Table Sessions.
- Separate additional-order batches.
- Order More / Order Again.
- FCFS order queue.
- NEW → ACCEPTED → PREPARING → READY → SERVED.
- Optional REJECTED/CANCELLED terminal state.
- Running bill and price snapshots.
- Manual payment method recording.
- Checkout & Close.
- Audit History.
- Table reset after closure.
- Owner/Admin authentication.
- Hidden direct /admin route.
- Menu/category/media/table management.
- Floating Call Waiter CTA.
- Best-effort 2–3 second vibration.
- Admin waiter-call notification + sound.
- Fully responsive customer/Admin UI.

# 19\. Explicitly NOT in V1

- SaaS/multi-restaurant architecture.
- Restaurant registration/onboarding.
- Subscription billing.
- Customer accounts, PII or customer history.
- Online payment gateway.
- Delivery.
- Reservations.
- Inventory/procurement.
- Payroll.
- Supplier management.
- Multi-branch management.
- Customer CRM/loyalty/reviews.
- Complex analytics.
- Separate kitchen application.
- Public Admin/Staff login or Admin link.

# 20\. Codex Completion Directive

Inspect the existing local Lovable project first. Preserve working components and adapt to the existing stack. Then reconcile the entire codebase against every requirement in this document, including this final revision. Implement all missing functionality and fix incorrect business logic. Verify permanent QR identity, central menu routing, Admin QR recovery/download/share, one active session per table, separate additional order batches, server-driven FCFS ordering, price snapshots, running bills, checkout/audit/reset lifecycle, hidden protected /admin access, Call Waiter notifications/vibration, premium responsive design, security, loading/error/empty states, and migration readiness. Do not add excluded features. Run the complete end-to-end and edge-case tests before declaring completion.

# FINAL ADMIN UX REVISION — DAILY OPERATIONS VS MANAGEMENT

This section is authoritative for the Admin experience and clarifies that daily restaurant operations must be separated from occasional menu/content management.

# 1\. Admin Dashboard = Daily Operations

After a successful Admin login, the owner should land on an operational Dashboard. The dashboard must NOT be overloaded with menu editing, image management or other occasional configuration controls.

```
/admin
   ↓
Dashboard

TODAY'S OPERATIONS
• New Orders
• Preparing
• Ready
• Active Tables
• Running Bills
• Waiter Calls
• Quick operational actions
```

- Dashboard is the first screen after login.
- Prioritize information the owner/counter staff needs during normal restaurant service.
- New orders and waiter calls should be visually prominent.
- Show active/occupied vs available tables.
- Show relevant running totals and order counts.
- Do not place full Menu CRUD forms on the Dashboard.
- Do not place image upload galleries, Reel URL editing or category management on the Dashboard.
- Avoid cluttering daily operations with rarely used configuration controls.

# 2\. Recommended Admin Sidebar

```
ADMIN
├── Dashboard
├── Orders
├── Waiter Calls
├── Tables
│   └── QR Codes
├── Menu
│   ├── Categories
│   ├── Menu Items
│   └── Media / Gallery
├── Audit History
└── Profile
    ├── Account Details
    ├── Change Password
    └── Logout
```

- Use a persistent sidebar on desktop/laptop.
- On tablet/mobile, collapse it into a drawer/menu.
- Dashboard, Orders and Waiter Calls are operational sections.
- Menu and Media are separate management sections accessed intentionally from the sidebar.
- Profile is separate from operational screens.
- Do not put public-facing Admin links anywhere in the customer website.

# 3\. Orders Page

- Dedicated full order-management page.
- Show FCFS incoming order queue.
- Filter/view by New, Accepted, Preparing, Ready, Served and optionally Rejected/Cancelled.
- Open an order to see its table, session, timestamp, items, quantities and price snapshots.
- Allow status actions without navigating into menu management.
- New orders should remain easy to identify and process quickly.

# 4\. Waiter Calls Page

- Dedicated operational page for waiter-call requests.
- Show active/new calls prominently with table number and timestamp.
- Play notification sound for newly received calls where browser/device permissions allow.
- Provide Acknowledge and Resolved actions.
- Allow the owner to quickly clear resolved calls without affecting orders or bills.
- Do not mix waiter-call controls into menu editing pages.

# 5\. Tables & QR Page

- Dedicated Tables section for operational table status and QR management.
- Show table number, Available/Active state and relevant active session information.
- QR Codes subsection lets Admin enter/select a table number.
- Generate/retrieve that table's permanent QR.
- Preview, download and share QR.
- Recover a misplaced physical QR without creating an order/session.
- Do not require the owner to edit menu content to manage QR codes.

# 6\. Menu Management = Separate Management Area

Menu management must be deliberately separated from the daily Dashboard/Orders workflow. The owner enters it only when they want to change what customers see.

```
ADMIN SIDEBAR
Menu
  → Categories
  → Menu Items
  → Media / Gallery
```

- Categories page: create, rename, delete safely, enable/disable and reorder categories.
- Menu Items page: create, edit, delete, reorder, change price, description, Veg/Non-Veg, tags and availability.
- Media/Gallery page or item media manager: upload, replace, delete and reorder item images.
- Item editor: configure the optional Instagram Reel/video URL.
- Changes must update the same central customer menu; no QR reprint is required.
- Historical orders must retain their name/price snapshots even after menu edits.
- Menu management should not visually dominate the daily operations dashboard.

# 7\. Menu Item Editing Flow

```
Admin
  ↓
Sidebar → Menu → Menu Items
  ↓
Select Chicken Biryani
  ↓
EDIT

Chicken Biryani
Price: ₹240
Description: ...
Veg/Non-Veg: Non-Veg
Tags: Bestseller, Spicy
Availability: Available

Images:
[1] [2] [3]
[Upload] [Replace] [Delete] [Reorder]

Instagram Reel:
[ https://... ]

[SAVE CHANGES]
```

- Use a dedicated item editor rather than putting all fields on the dashboard.
- Allow the owner to make one or multiple changes and save them explicitly.
- Show clear success/error feedback.
- Do not change existing historical order totals when price is edited.
- The current customer menu should reflect the new menu price for future orders.

# 8\. Categories Management

```
Menu → Categories

☰ Starters
☰ Soups
☰ Biryani
☰ Chinese
☰ Indian Main Course
☰ Breads
☰ Desserts
☰ Beverages

[+ ADD CATEGORY]
```

- Categories are independently managed from daily order processing.
- Owner can add, rename, delete safely, reorder and enable/disable.
- Changing category order affects the customer menu only.
- Deleting a category must be handled safely so existing menu items are not accidentally destroyed.

# 9\. Profile / Account Settings

The owner's personal Admin account controls must be separate from restaurant menu and daily operations.

```
ADMIN SIDEBAR → PROFILE

Account
Email / Mobile
[Update if supported]

Security
Current Password
New Password
Confirm New Password

[CHANGE PASSWORD]

[LOG OUT]
```

- Owner can access Profile from the Admin sidebar.
- Owner can update/change their password.
- Password change must require appropriate current-password verification or equivalent secure re-authentication.
- New password must satisfy the application's configured security requirements.
- Never display the existing password.
- Do not store plaintext passwords.
- Provide clear success/error feedback after a password change.
- Profile/settings must not expose customer data.

# 10\. Admin UX Principle — What the Owner Sees Daily

```
LOGIN
  ↓
DASHBOARD

"WHAT NEEDS MY ATTENTION RIGHT NOW?"

New Orders
Preparing
Ready
Active Tables
Waiter Calls
Running Bills

                    ↓
          Sidebar when needed

Orders       → process orders
Waiter Calls → handle assistance requests
Tables       → table status / QR
Menu         → edit menu
Audit        → review closed sessions
Profile      → password/account
```

The product should feel like a restaurant operations console rather than a CMS. The owner should not have to navigate through menu editors merely to process an order, and menu editing should not clutter the service workflow.

# 11\. Final Admin Definition of Done

- Admin login lands on Dashboard.
- Dashboard is focused on daily operations.
- Orders has its own dedicated page.
- Waiter Calls has its own dedicated page/operational view.
- Tables and QR management have their own section.
- Menu management is accessed separately from the sidebar.
- Categories have their own management flow.
- Menu items have their own edit flow.
- Images/gallery and Reel/video links can be edited separately/within the item editor.
- Prices can be edited from Menu Item management.
- Audit History is separate from current operations.
- Profile is separate and provides password update/security controls.
- Logout is available from Profile/sidebar.
- Customer-facing website contains no visible Admin entry.
- All Admin routes remain protected.

# 12\. Codex Instruction — Admin UX

When implementing the Admin panel, do not combine every management feature into one giant dashboard. The Dashboard is the daily operational command center. Orders, Waiter Calls and Tables are operational tools. Menu/Categories/Items/Media are separate management pages accessible through the sidebar and used when the owner wants to edit restaurant content. Profile is a separate account/security area where the owner can change the password and log out. Maintain this separation on desktop and responsive mobile/tablet layouts.