# TableServe Pro

BUILD A COMPLETE RESPONSIVE QR-BASED RESTAURANT ORDERING SYSTEM

Build a complete, production-quality, fully responsive web application for one single restaurant.

This is NOT a SaaS platform and must NOT be architected as a multi-restaurant system.

The application has two sides:

Customer-facing QR menu and ordering experience

Owner/Admin dashboard for managing the restaurant, tables, orders, running bills, checkout, and audit history

The goal is to create a polished, premium restaurant ordering experience that is simple for customers and extremely practical for restaurant staff.

1. CORE CONCEPT

Every physical restaurant table has its own permanent QR code.

For example:

Table 01 → unique QR

Table 02 → unique QR

Table 03 → unique QR

Table 04 → unique QR

The QR code identifies the table, not a particular order.

When a customer scans a table's QR code, they enter the restaurant's digital menu for that table.

Example:

/menu/table-07

The system must determine whether that table currently has an active session.

If the table is AVAILABLE:

Create a new Table Session when the customer confirms their first order.

If the table already has an ACTIVE session:

Do NOT create a new session.

Allow the customer to continue ordering and attach the new order to the existing active session.

The table remains active until the restaurant owner/admin explicitly checks it out and closes the session.

2. IMPORTANT — SINGLE RESTAURANT ONLY

Do NOT build:

Multi-restaurant support

Restaurant registration

Restaurant onboarding

Tenant IDs

SaaS subscription system

Multiple restaurant dashboards

Restaurant switching

White-label SaaS architecture

This application belongs to one restaurant.

Keep the architecture clean and appropriately scoped for one restaurant.

3. CUSTOMER EXPERIENCE

The customer should not need to create an account.

Do NOT ask for:

Name

Email

Phone number

Password

Address

Customer profile

Customer account

No customer registration or login.

The QR scan should take the customer directly to the restaurant menu.

4. PREMIUM CUSTOMER-FACING DESIGN

The customer-facing menu must NOT look like a basic HTML food list.

Design it like a premium modern restaurant digital experience.

Prioritize:

Beautiful food photography

Large high-quality food images

Elegant typography

Excellent spacing

Clear hierarchy

Premium cards

Smooth interactions

Subtle animations

Modern navigation

Fast browsing

Mobile-first design

Excellent touch targets

Responsive behavior across phones, tablets and desktops

The majority of customers will use this from their phones, so the mobile experience is extremely important.

The interface should feel like a polished restaurant application rather than a generic website.

Avoid unnecessary visual clutter.

Do not overuse animations.

Animations should support the experience rather than make it slow.

5. RESTAURANT BRANDING

The customer-facing experience should support the restaurant's:

Logo

Restaurant name

Cover/hero image

Brand identity

Primary/secondary colors

About information

Address

Opening hours

Instagram/social link where appropriate

Create the design so restaurant branding can be changed easily from the appropriate configuration/admin area.

6. CUSTOMER MENU

The customer should see the complete restaurant menu.

Organize menu items into categories.

Example:

Starters

Soups

Biryani

Main Course

Chinese

Breads

Desserts

Beverages

Categories must be dynamically manageable from Admin.

The customer should be able to:

Browse categories

Switch between categories

Scroll through items

Search items if appropriate

Open individual food items

View item details

Add items to cart

Change quantities

Remove items

Review cart

Confirm order

7. MENU ITEM EXPERIENCE

Each menu item should support:

Item name

Price

Description

Multiple images

Item-specific image gallery

Optional video/Reel

Availability

Tags

Possible tags:

Bestseller

New

Spicy

Popular

Chef's Special

Veg

Non-Veg

Do not display tags that have not been configured for an item.

8. ITEM GALLERY

When the customer clicks a food item, open a beautiful item detail experience.

Show:

Large primary image

Additional images

Image gallery

Food name

Price

Description

Tags

Availability

Add to Cart button

The gallery must contain images specifically belonging to that food item.

Do NOT create one generic restaurant gallery and reuse it for every food item.

9. INSTAGRAM REEL / VIDEO

Each food item may optionally have an Instagram Reel/video link.

If an item has a configured Reel/video:

Display an appropriate "Watch Reel" or video section inside the item detail experience.

If no Reel/video is configured:

Do not show an empty video section.

The video functionality should gracefully handle the absence of a link.

Do not make video loading block the rest of the item experience.

10. CART

The customer can add multiple items.

Example:

Chicken Biryani × 2
Butter Chicken × 1
Water × 2

Show:

Item

Quantity

Individual price

Subtotal

Total quantity

Grand total

Allow quantity changes and item removal.

The cart should be extremely easy to use on mobile.

Use a persistent/sticky cart indicator where appropriate.

11. ORDER CONFIRMATION

When the customer clicks:

Confirm Order

the system must associate the order with the table identified by the QR.

Do not ask the customer to manually enter their table number.

The table number comes from the QR.

Example:

Customer scanned Table 07.

The submitted order automatically becomes:

Table 07 — Order Batch #1

The customer should see a clear confirmation screen.

Example:

Order Confirmed
Table 07
Order #1047

Show the ordered items and relevant status.

12. TABLE SESSION SYSTEM

This is the central logic of the application.

A table has two important operational states:

AVAILABLE

No active customer session exists.

ACTIVE

A customer session is currently open.

When the first order is placed

If Table 07 is AVAILABLE:

Create:

Session #1047

Example:

Table: 07
Started: 8:12 PM
Status: ACTIVE

The table immediately becomes occupied/active.

13. ACTIVE TABLE MUST NOT CLEAR AUTOMATICALLY

This is extremely important.

Once a customer places an order:

DO NOT clear the table after the first order.

The table remains active even if:

The first order is completely prepared

The order is served

The customer waits

The customer scans the QR again

The customer places another order

The table remains active until the owner/admin closes it.

14. SECOND / ADDITIONAL ORDERS

Suppose Table 07 already has:

Order Batch #1:

Chicken Biryani × 2
Butter Chicken × 1
Water × 2

Later the customer wants:

Coke × 2

They can use the same table QR again.

The system detects:

Table 07 already has an active session.

Therefore:

DO NOT create a new table session.

Instead create:

Order Batch #2

containing:

Coke × 2

Both order batches belong to the same active Table 07 session.

15. NEVER MODIFY OLD ORDERS UNNECESSARILY

Do not constantly mutate the original order when the customer orders additional items.

Maintain separate order batches inside the same active session.

Example:

SESSION #1047
TABLE 07

Order #1047-1 — 8:12 PM

Chicken Biryani × 2
Butter Chicken × 1
Water × 2

Order #1047-2 — 8:45 PM

Coke × 2

Order #1047-3 — 9:05 PM

Gulab Jamun × 1

This keeps the operational history clean and makes it obvious when additional orders were placed.

The customer should still experience this as one continuous table order.

16. "ORDER MORE" / "ORDER AGAIN"

Provide an obvious option for customers to continue ordering while their table session is active.

For example:

Order More

or

Order Again

The customer can return to the menu and add additional items.

Those items become a new order batch within the same active table session.

Do not create a new customer account or new table session.

17. RUNNING BILL

The bill must continuously update throughout the active session.

Example:

8:12 PM:

Chicken Biryani ×2 = ₹480
Butter Chicken ×1 = ₹320
Water ×2 = ₹40

Running total:

₹840

At 8:45 PM the customer orders:

Coke ×2 = ₹100

Running total becomes:

₹940

At 9:05 PM:

Gulab Jamun ×1 = ₹120

Running total becomes:

₹1,060

The Admin dashboard must always show the current running total.

18. PRICE SNAPSHOT

When an item is ordered, store the price at the time of ordering.

For example:

Chicken Biryani is ₹240 today.

Customer orders two.

Store:

2 × ₹240 = ₹480

If the owner changes the menu price tomorrow to ₹280, the historical order must still show:

Chicken Biryani ×2 = ₹480

Do not dynamically recalculate old orders using the current menu price.

19. FCFS ORDER QUEUE — VERY IMPORTANT

The Admin dashboard must preserve the first-come-first-served order sequence.

Orders should be displayed according to the time they were submitted.

Example:

NEW ORDERS

#1047-1
TABLE 07
8:12 PM

#1048-1
TABLE 03
8:14 PM

#1049-1
TABLE 11
8:16 PM

#1050-1
TABLE 02
8:19 PM


The oldest pending order should appear first.

Do NOT sort orders randomly.

Do NOT prioritize a later order simply because it belongs to a different table.

Maintain a clear FCFS queue based on order submission timestamp.

20. ADMIN DASHBOARD

Create a separate secure Admin/Owner interface.

Only the owner/admin should be able to access it.

The dashboard should be practical rather than overly decorative.

Prioritize:

Speed

Readability

Clear statuses

Large action buttons

Minimal unnecessary animations

Easy table identification

Clear order queue

Clear running bills

21. ADMIN NAVIGATION

Recommended structure:

Dashboard

Orders

Tables

Menu

Categories

Audit History

Settings

Keep the navigation simple.

Do not add unnecessary modules.

22. ADMIN DASHBOARD OVERVIEW

The dashboard should immediately show:

Number of active tables

Number of available tables

New/pending orders

Preparing orders

Ready orders

Current active table totals

Example:

ACTIVE TABLES

Table 01
AVAILABLE

Table 02
₹1,050
3 Orders

Table 03
₹680
1 Order

Table 04
AVAILABLE

Table 05
₹1,420
4 Orders


23. TABLE VIEW

Clicking a table should open its active session.

Example:

TABLE 07

Session #1047

Started:
8:12 PM

Current Bill:
₹1,060

Orders:
3

--------------------------------

Order #1047-1
8:12 PM

Chicken Biryani ×2
Butter Chicken ×1
Water ×2

--------------------------------

Order #1047-2
8:45 PM

Coke ×2

--------------------------------

Order #1047-3
9:05 PM

Gulab Jamun ×1

--------------------------------

TOTAL
₹1,060

[ VIEW BILL ]

[ CHECKOUT & CLOSE ]


24. ORDER STATUSES

Each order batch should have a clear status.

Recommended lifecycle:

NEW → ACCEPTED → PREPARING → READY → SERVED

The admin can move an order through these stages.

The interface should make it obvious which orders require attention.

25. NEW ORDERS

New orders should be prominent.

Example:

NEW ORDER

Order #1052
TABLE 04
9:12 PM

Chicken Biryani ×2
Coke ×2

[ ACCEPT ]


After acceptance:

ACCEPTED

Then:

PREPARING

Then:

READY

Then:

SERVED

The order's timestamp should remain visible.

26. TABLE STATUS VS ORDER STATUS

Do not confuse these.

An individual order can be:

New

Accepted

Preparing

Ready

Served

while the table session remains:

ACTIVE

The table does NOT become available simply because all current orders are served.

Only:

Checkout & Close

can end the table session.

27. CHECKOUT

When the customer is finished and payment has been received, the owner/admin can select:

Checkout & Close

Show the final bill.

Example:

TABLE 07

FINAL BILL

Chicken Biryani
2 × ₹240
₹480

Butter Chicken
1 × ₹320
₹320

Water
2 × ₹20
₹40

Coke
2 × ₹50
₹100

Gulab Jamun
1 × ₹120
₹120

--------------------------------

TOTAL
₹1,060


The system does NOT need to process the actual payment.

The restaurant can manually collect:

Cash

UPI

Card

Other payment method

The application is responsible for generating/recording the bill.

28. PAYMENT

Do NOT implement a payment gateway in this version.

Do not make online payment mandatory.

The restaurant owner manually receives payment.

The software's responsibility is:

Calculate bill

Display final amount

Generate final bill

Close session

Preserve audit record

Optionally allow Admin to record a simple payment method such as:

Cash

UPI

Card

Other

But actual payment processing is outside the scope.

29. CLOSING A TABLE

Once the owner clicks:

Checkout & Close

the active session is finalized.

Record:

Session ID

Table number

Start time

Close time

Duration

All order batches

Items

Quantities

Prices at order time

Final total

Optional payment method

Then:

Remove the session from Active Tables.

The table becomes:

AVAILABLE

30. NEXT CUSTOMER ON SAME TABLE

This is very important.

Suppose:

Table 07
Session #1047
₹1,060

gets closed.

Table 07 becomes AVAILABLE.

The next customer scans the exact same physical QR code.

The system must create a completely new session:

Session #1093

It must NOT attach itself to Session #1047.

The previous session remains safely stored in Audit History.

This provides a clean lifecycle:

AVAILABLE
   ↓
NEW SESSION
   ↓
ACTIVE
   ↓
ADDITIONAL ORDERS
   ↓
CHECKOUT
   ↓
CLOSED
   ↓
AUDIT HISTORY
   ↓
AVAILABLE


31. AUDIT HISTORY

Every closed session must be retained in Audit History.

The active table dashboard should not become cluttered with old sessions.

Audit History should provide a historical record.

Example:

AUDIT HISTORY

Session #1047
Table 07
8:12 PM → 9:32 PM
₹1,060

Session #1046
Table 03
7:48 PM → 9:02 PM
₹840

Session #1045
Table 07
6:10 PM → 7:04 PM
₹460


Clicking a session should show:

Table

Session ID

Start time

End time

Duration

Order batches

Order timestamps

Items

Quantities

Prices

Final bill

Payment method if recorded

32. NO CUSTOMER HISTORY

Do NOT create a customer history system.

The application should not know that:

Customer A came yesterday and Customer A came today.

There is no customer identity.

Only operational restaurant data should exist.

The system may know:

Table 07 was occupied from 8:12 PM to 9:32 PM.

It may know:

Order #1047 was submitted at 8:12 PM.

But it must NOT store:

Customer name

Customer email

Customer phone

Customer account

Customer password

Customer address

Customer identity

33. MENU ADMINISTRATION

Admin must be able to manage the complete menu.

Allow:

Categories

Add

Edit

Delete

Reorder

Enable/disable

Menu Items

Add

Edit

Delete

Reorder

Change category

Change price

Change description

Change images

Add/remove Reel/video

Add/remove tags

Mark available/unavailable

34. ITEM AVAILABILITY

Admin should be able to mark an item:

Available

or

Unavailable

If unavailable:

Customer should clearly see that it is unavailable.

Customer should not be able to add it to cart.

Do not delete the item merely because it is temporarily unavailable.

35. TABLE MANAGEMENT

Admin must be able to manage restaurant tables.

For example:

Table 01
Table 02
Table 03
...
Table 20

Admin should be able to:

Add table

Remove table

Rename/number table where appropriate

View table status

Generate QR code

Download/print QR code

Each table must have a unique QR identity.

36. QR CODES

Generate a unique QR for every table.

The QR should route directly to that table's customer menu.

Example:

Table 07:

/menu/table-07

However, implement the backend/database logic securely so users cannot simply manipulate URLs to impersonate another table in a way that compromises the system.

The table identifier should be mapped to the correct restaurant table record.

The QR should remain permanent for that table unless the admin intentionally regenerates it.

37. ADMIN AUTHENTICATION

Create an owner/admin login.

Only authenticated Admin users can access:

Dashboard

Orders

Tables

Menu

Categories

Audit History

Settings

Customer menu must remain publicly accessible through QR without login.

Do not create customer authentication.

38. SECURITY

Implement sensible application security.

Do not expose:

Database credentials

API keys

Secret tokens

Authentication secrets

in client-side code.

Protect admin routes.

Validate user input.

Validate uploaded media.

Use appropriate server-side authorization for administrative operations.

39. ENVIRONMENT VARIABLES

Create a:

.env.example

file containing placeholders for all required environment variables.

For example:

DATABASE_URL=
AUTH_SECRET=
STORAGE_URL=
STORAGE_KEY=
OTHER_REQUIRED_VARIABLE=


Use the actual names required by the implementation.

IMPORTANT:

DO NOT create the real .env file.

DO NOT hardcode secrets.

DO NOT put real API keys/passwords in the project.

I will manually create the real .env file later using the .env.example as the reference.

The project must work correctly once the required environment variables are supplied.

40. DATABASE DESIGN

Use a clean relational/data model.

At minimum, the system should conceptually contain:

Restaurant Configuration

Since this is one restaurant, this can be represented as a single restaurant configuration rather than a multi-tenant architecture.

Tables

id

table number/name

QR identifier/token

status

Categories

id

name

display order

active status

Menu Items

id

category id

name

description

price

availability

display order

tags

Menu Media

id

menu item id

image/video URL

media type

display order

Active Table Sessions

session id

table id

started at

status

Order Batches

order id

session id

table id

created at

status

sequence/order number

Order Items

order id

menu item id

item name snapshot

price snapshot

quantity

subtotal

Bills / Closed Sessions

session id

table id

opened at

closed at

final total

payment method if recorded

final status

Design the actual schema appropriately for the chosen technology.

41. ORDER SEQUENCING

Every order batch must have a reliable timestamp and/or sequential identifier.

The Admin order queue must use the server-side creation timestamp/order sequence.

Do not rely solely on the customer's device clock.

This is necessary to maintain the correct FCFS order.

Example:

Order #1001 — 8:01:02 PM
Order #1002 — 8:01:18 PM
Order #1003 — 8:02:04 PM


The Admin should see them in exactly that logical sequence.

42. REAL-TIME UPDATES

Where practical, Admin should receive new orders without manually refreshing the entire page.

When a customer places an order:

Admin should see the new order appear promptly.

When an additional order is placed for an active table:

The running bill should update promptly.

When Admin changes order status:

The customer-facing active order view should reflect the status where appropriate.

Choose an implementation appropriate to the selected stack.

Do not introduce unnecessary infrastructure if a simpler reliable solution is sufficient.

43. RESPONSIVE ADMIN

The Admin dashboard must also be fully responsive.

It should work on:

Desktop

Laptop

Tablet

Mobile

The desktop layout can use a richer dashboard with multiple columns.

On mobile, convert it into a clean stacked layout.

Do not simply shrink the desktop interface.

Design mobile Admin intentionally.

44. CUSTOMER ORDER STATUS

After placing an order, the customer should be able to see the status of their active orders.

For example:

ORDER #1047

Table 07

Chicken Biryani ×2
Butter Chicken ×1

✓ Order Received
✓ Accepted
● Preparing
○ Ready
○ Served


If the customer places another order:

ORDER #1047-2

Coke ×2

● Preparing


Keep this simple.

45. CUSTOMER ACTIVE SESSION

While the table session is active, the customer should have access to:

Current orders

Previous order batches within the current session

Current running total

Order status

Order More button

Do not expose old customers' sessions.

Only the currently active table session should be associated with the current QR/table context.

46. PRIVACY AND SESSION HANDLING

Do not create customer accounts.

Do not collect customer PII.

The application only needs a temporary customer/table context to let the customer interact with the current table session.

After the table is closed, the customer-facing session should no longer be treated as an active ordering session.

The restaurant's audit history remains on the Admin side.

47. BILLING LOGIC

Calculate totals carefully.

For every order item:

subtotal = quantity × price_at_order_time


Session total:

sum(all order item subtotals)


The final bill should represent every valid order batch within that session.

Do not double-count items.

Do not overwrite previous order batches.

Do not use the current menu price to calculate historical orders.

48. UI STATES

Design proper states for the interface.

Customer:

Loading

Empty category

Item unavailable

Empty cart

Cart with items

Order submitting

Order confirmed

Order status

Active session

Session closed

Admin:

Loading

No active tables

Available table

Active table

New order

Preparing order

Ready order

Served order

Checkout

Empty audit history

Menu empty state

Do not leave blank screens.

49. ERROR HANDLING

Handle realistic failures gracefully.

Examples:

Network error

Order submission failure

Item became unavailable while customer was ordering

Session was closed while a customer was viewing the menu

Admin action failed

Invalid table QR

Missing menu image

Broken Reel/video link

Show useful human-readable messages.

Never expose raw technical errors to customers.

50. PERFORMANCE

The customer menu should load quickly.

Optimize:

Images

Lazy loading

Responsive images

Video loading

Database queries

API requests

Client-side rendering

Do not automatically load every high-resolution food image and every video on the initial page.

Load media intelligently.

The application should feel fast even on ordinary mobile connections.

51. ACCESSIBILITY

Use:

Semantic HTML

Proper button labels

Accessible contrast

Keyboard navigation where applicable

Visible focus states

Appropriate touch target sizes

Alt text for food images

Do not sacrifice usability for visual effects.

52. DESIGN LANGUAGE

The design should feel:

Premium + Modern + Elegant + Restaurant-focused

Customer side:

Visual

Immersive

Food-focused

Minimal

Sophisticated

Admin side:

Operational

Clear

Dense where useful

Fast

Professional

Do NOT make both interfaces look identical.

The customer side is a premium experience.

The Admin side is a productivity tool.

53. DO NOT OVERDESIGN

Avoid:

Excessive gradients

Excessive glassmorphism

Excessive animations

Huge unnecessary hero sections

Decorative elements that interfere with ordering

Complicated navigation

Unnecessary popups

Excessive modals

The food and ordering workflow should remain the focus.

54. DO NOT ADD UNREQUESTED FEATURES

Do NOT add:

Customer accounts

Customer profiles

Customer loyalty

Customer CRM

Customer reviews

Customer phone collection

Customer email collection

Call waiter

Online payment gateway

Delivery system

Reservation system

Inventory management

Supplier management

Employee payroll

Multi-restaurant SaaS

Subscription billing

Restaurant onboarding

Multi-branch management

Unnecessary analytics

Complex accounting

Keep the product focused.

55. ADMIN MENU MANAGEMENT UX

Make menu editing convenient enough that a restaurant owner can use it without technical knowledge.

Example:

MENU

Biryani
  ├── Chicken Biryani
  ├── Mutton Biryani
  └── Special Biryani

Beverages
  ├── Water
  ├── Coke
  └── Fresh Lime


Admin should be able to quickly:

Add category

Add item

Edit item

Change price

Upload images

Add Reel link

Toggle availability

Reorder items

56. MEDIA MANAGEMENT

When uploading multiple food images:

Allow Admin to:

Upload

Preview

Delete

Reorder

The first image should be treated as the primary image.

Avoid requiring technical knowledge.

57. TABLE QR MANAGEMENT UI

Admin should see:

TABLES

Table 01     AVAILABLE     [QR]
Table 02     ACTIVE        [QR]
Table 03     AVAILABLE     [QR]
Table 04     ACTIVE        [QR]


Clicking QR should provide a clean QR preview and appropriate print/download functionality.

Make QR printing practical because these will physically go onto restaurant tables.

58. FINAL PRODUCT STRUCTURE

The final application should conceptually provide:

CUSTOMER
│
├── Scan Table QR
│
├── Restaurant Menu
│   ├── Categories
│   ├── Food Items
│   ├── Food Gallery
│   ├── Optional Reel
│   └── Cart
│
├── Confirm Order
│
├── Active Orders
│
├── Running Bill
│
└── Order More


And:

ADMIN
│
├── Dashboard
│
├── FCFS Order Queue
│
├── Active Tables
│
├── Table Sessions
│
├── Running Bills
│
├── Checkout & Close
│
├── Audit History
│
├── Menu
│   ├── Categories
│   ├── Items
│   ├── Images
│   ├── Videos/Reels
│   └── Availability
│
├── Tables
│   └── QR Codes
│
└── Settings


59. MOST IMPORTANT BUSINESS LOGIC

Implement and test this exact scenario:

Step 1

Table 07 is AVAILABLE.

Step 2

Customer A scans Table 07 QR.

Step 3

Customer orders:

Chicken Biryani ×2
Water ×2

Step 4

System creates:

Session #1001
Table 07
Status ACTIVE

Step 5

Admin sees the order in the FCFS queue.

Step 6

Customer later scans the same QR again.

Step 7

System detects Session #1001 is still ACTIVE.

Step 8

Customer orders:

Coke ×2

Step 9

System creates a second order batch under Session #1001.

Step 10

Admin sees the second order after the first order in the correct chronological sequence.

Step 11

Running bill automatically includes everything.

Step 12

Customer orders dessert.

Create another order batch under the same session.

Step 13

All orders are served.

Step 14

Owner receives payment.

Step 15

Owner clicks:

CHECKOUT & CLOSE

Step 16

System generates the final bill.

Step 17

Session #1001 moves into Audit History.

Step 18

Table 07 becomes AVAILABLE.

Step 19

A completely different customer scans the same Table 07 QR.

Step 20

System creates:

Session #1002

It must NOT attach to Session #1001.

This exact lifecycle must work correctly.

60. FINAL QUALITY REQUIREMENT

Do not build this as a rough prototype with placeholder interfaces.

Build a complete, coherent application with:

Production-quality UI

Responsive layouts

Functional navigation

Functional database operations

Proper authentication

Working QR table identification

Working menu management

Working cart

Working order creation

Working active table sessions

Working additional orders

Working FCFS queue

Working order statuses

Working running bills

Working checkout

Working audit history

Working QR generation

Proper error handling

Proper loading states

Proper empty states

Proper security

Proper environment configuration

Use realistic sample restaurant/menu data for development/demo purposes where necessary.

Make the interface visually polished enough that it can later be demonstrated directly to a restaurant owner.

61. ENVIRONMENT FILE REMINDER

Create only:

.env.example

with all required variables documented.

Do NOT create a real .env.

Do NOT insert real secrets.

I will manually create the .env file later.

62. BEFORE FINISHING

Test the complete flow end-to-end:

QR → Table → Menu → Item Gallery → Reel → Cart → Confirm → FCFS Admin Order → Accept → Preparing → Ready → Served → Additional Order → Updated Running Bill → Checkout → Final Bill → Audit History → Table Available → New Session

Also test the same flow on:

Mobile

Tablet

Desktop

Fix layout problems, overflow, broken states, incorrect totals, session duplication, ordering sequence problems, and QR/table identification issues before considering the implementation complete.

The final result should feel like a real, polished restaurant ordering product, not a generic CRUD dashboard.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f2f2cb75-ed89-4861-891e-2d3764ad0197).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
