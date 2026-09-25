# StitchFlow Garments POS & ERP — Architecture & Technical Specification

## 1. Complete System Architecture
StitchFlow is designed as an **Offline-First Commercial Retail ERP & Point of Sale System** tailored specifically for apparel and garments retail. It operates seamlessly across two states:
- **Offline Mode**: Operates autonomously in local environments (browsers, POS terminals, tablets) using client-side IndexedDB with atomic transactions and a persistent Sync Queue.
- **Online Mode**: Communicates with the Express REST API backend, persisting data into a relational database with strict ACID transactional integrity, revision tracking, and idempotency guarantees.
- **Bi-directional Synchronization Engine**: Automatically detects network availability, processes pending sync batches chronologically using unique transaction IDs and idempotency tokens, detects concurrent stock mutations, and applies authoritative reconciliation.

```
+-----------------------------------------------------------------------------------+
|                                PRESENTATION LAYER                                 |
|  [ POS Terminal / Barcode Scanner ]  [ Inventory & Matrix ]  [ Financial Ledger ]  |
|  [ Customer & Supplier Portals ]    [ Sales & Returns ]     [ Executive Reports ] |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                               BUSINESS LOGIC LAYER                                |
|  - Money / Decimal Math Engine         - Transactional Stock Allocation           |
|  - Garment Variant Matrix Engine       - Retail Accounting & True COGS Calculator  |
|  - RBAC & Permission Guard             - Barcode (EAN-13 / Code128 / SKU) Gen     |
+-----------------------------------------------------------------------------------+
                     │                                         │
        [Offline Mode / Local Store]              [Online Mode / REST API Client]
                     ▼                                         ▼
+─────────────────────────────────────────+   +─────────────────────────────────────+
|       OFFLINE REPOSITORY (IndexedDB)    |   |     EXPRESS REST API SERVER         |
|  - Stores all 28+ relational tables     |   |  - Route Handlers & Middlewares     |
|  - Client Outbox Sync Queue             |   |  - Permission & Auth Validations    |
|  - Local Audit Trail & Settings         |   |  - Database Transaction Isolation   |
+─────────────────────────────────────────+   +─────────────────────────────────────+
                     │                                         │
                     │          ┌───────────────────┐          │
                     └─────────►│ SYNC ENGINE QUEUE │◄─────────┘
                                │ - Idempotency Key │
                                │ - Stock Conflict  │
                                │ - Delta Sync Log  │
                                └───────────────────┘
```

---

## 2. Recommended Technology Stack
- **Frontend Core**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Client Offline Storage**: High-performance typed IndexedDB wrapper with transaction guarantees.
- **Backend / API**: Node.js, Express, TypeScript (`tsx`).
- **Database Engine**: Relational SQL engine with Write-Ahead Logging & JSON state snapshots with strict relational constraints and indexing.
- **Security**: PBKDF2/SHA-256 salted password hashing, JWT/Session tokens, HTTP Bearer auth, strict schema validation.
- **Print Engine**: Pure CSS-driven print styling for Standard A4 Invoices and 58mm / 80mm ESC/POS-compatible Thermal Receipts.

---

## 3. Folder Structure
```
/
├── server.ts                  # Express Backend + Vite Middleware Bridge
├── index.html                 # PWA App Shell
├── public/
│   ├── manifest.json          # PWA Manifest
│   ├── sw.js                  # Service Worker
│   └── icon.svg               # Vector Brand Icon
├── src/
│   ├── main.tsx               # Client Entry Point
│   ├── App.tsx                # App Orchestrator & View Switcher
│   ├── types/                 # Shared Relational Domain Types
│   │   ├── auth.ts
│   │   ├── inventory.ts
│   │   ├── sales.ts
│   │   ├── accounting.ts
│   │   └── sync.ts
│   ├── db/                    # Database & Storage Layer
│   │   ├── schema.sql         # Normalized SQL Schema
│   │   ├── serverDb.ts        # Server Database Controller (ACID + JSON/SQL)
│   │   └── indexedDb.ts       # Client IndexedDB Offline Repository
│   ├── sync/                  # Synchronization Engine
│   │   ├── syncEngine.ts      # Bi-directional Sync, Retry & Conflict Handler
│   │   └── syncQueue.ts       # Offline Mutation Queue with Idempotency
│   ├── services/              # Pure Business Logic Layer
│   │   ├── authService.ts     # Login, Session & RBAC
│   │   ├── inventoryService.ts# Variant Matrix, Barcodes & Stock Auditing
│   │   ├── posService.ts      # Cart Calculations, Hold/Resume & Checkout
│   │   ├── accountingService.ts# True COGS, Ledger & P&L calculation
│   │   ├── reportService.ts   # Analytics & Exports
│   │   └── backupService.ts   # Backup/Restore JSON & SQL Dumps
│   ├── components/            # UI Components
│   │   ├── layout/            # Sidebar, Header, Connectivity Bar
│   │   ├── pos/               # POS Terminal, Variant Modal, Hold Drawer
│   │   ├── inventory/         # Product Matrix Creator, Barcode Printable
│   │   ├── receipts/          # A4 Invoice & 58mm/80mm Thermal Receipt
│   │   ├── sync/              # Sync Status, Conflict Resolver
│   │   ├── customers/         # Customer Ledger & Payment Modal
│   │   ├── suppliers/         # Supplier Ledger & PO Modal
│   │   ├── reports/           # Financial, Sales & Inventory Visualizers
│   │   └── common/            # Data Tables, Modals, Badges, Stat Cards
│   └── utils/                 # Currency formatters, Barcode generator, CSV exporter
```

---

## 4. Complete Database Tables and Relationships
The normalized database consists of **30 interconnected tables**:

1. `users` (id, username, email, password_hash, full_name, role_id, status, created_at, updated_at)
2. `roles` (id, name, description, created_at)
3. `permissions` (id, role_id, module, can_view, can_create, can_edit, can_delete)
4. `categories` (id, name, code, description, is_active)
5. `brands` (id, name, code, is_active)
6. `sizes` (id, name, code, sort_order) - e.g. S, M, L, XL, XXL, 30, 32, 34, 36, etc.
7. `colors` (id, name, hex_code) - e.g. Black, White, Navy Blue, Maroon, Beige, Olive.
8. `products` (id, name, category_id, brand_id, subcategory, fabric, gender, season, rack_location, image_url, is_active, created_at, updated_at)
9. `product_variants` (id, product_id, size_id, color_id, sku, barcode, purchase_price, sale_price, wholesale_price, discount, tax_percent, min_stock, is_active, created_at)
10. `stock` (id, variant_id, current_quantity, reserved_quantity, updated_at)
11. `stock_movements` (id, variant_id, movement_type [PURCHASE, SALE, RETURN, EXCHANGE_IN, EXCHANGE_OUT, ADJUSTMENT], reference_type, reference_id, quantity_change, cost_per_unit, balance_after, reason, user_id, created_at)
12. `customers` (id, name, phone, whatsapp, email, address, opening_balance, current_balance, created_at, updated_at)
13. `suppliers` (id, name, company_name, phone, whatsapp, email, address, opening_balance, current_payable, created_at, updated_at)
14. `employees` (id, name, phone, cnic, salary, joining_date, role, status, created_at)
15. `sales` (id, invoice_number, customer_id, cashier_id, sale_date, subtotal, discount_amount, tax_amount, grand_total, paid_amount, balance_due, payment_status [PAID, PARTIAL, DUE], sale_status [COMPLETED, HELD, CANCELLED, RETURNED], notes, sync_id, created_at)
16. `sale_items` (id, sale_id, variant_id, quantity, unit_cost, unit_price, discount, tax_amount, subtotal, total)
17. `sale_payments` (id, sale_id, payment_method [CASH, CARD, BANK_TRANSFER, EASYPAISA, JAZZCASH, CREDIT], amount, transaction_reference, notes, created_at)
18. `sales_returns` (id, return_number, original_sale_id, customer_id, return_date, total_refund_amount, refund_type [CASH_REFUND, STORE_CREDIT, EXCHANGE], notes, cashier_id, created_at)
19. `sales_return_items` (id, return_id, sale_item_id, variant_id, quantity, refund_price, reason, restock_condition)
20. `purchases` (id, purchase_invoice_no, supplier_id, invoice_date, subtotal, tax_amount, discount_amount, grand_total, paid_amount, balance_due, payment_status, created_at)
21. `purchase_items` (id, purchase_id, variant_id, quantity, unit_purchase_price, discount, tax_amount, total)
22. `purchase_payments` (id, purchase_id, payment_method, amount, reference_no, created_at)
23. `supplier_payments` (id, supplier_id, payment_date, amount, payment_method, reference_no, notes, user_id, created_at)
24. `customer_payments` (id, customer_id, payment_date, amount, payment_method, reference_no, notes, user_id, created_at)
25. `expense_categories` (id, name, description)
26. `expenses` (id, category_id, description, amount, expense_date, payment_method, reference_no, user_id, created_at)
27. `cash_sessions` (id, user_id, opening_time, closing_time, opening_cash, closing_cash, total_sales_cash, cash_difference, status [OPEN, CLOSED])
28. `audit_logs` (id, user_id, user_name, action, module, record_id, old_values, new_values, ip_address, created_at)
29. `sync_queue` (id, transaction_id, entity_type, action [CREATE, UPDATE, DELETE], payload, status [PENDING, SYNCED, FAILED, CONFLICT], error_message, attempts, created_at, synced_at)
30. `settings` (key, value, description, updated_at)

---

## 5. Offline/Online Synchronization Architecture
- **Idempotency**: Every transaction generated offline receives a Client UUID `client_tx_id`. If sent multiple times due to network flakiness, the server detects duplicate UUIDs and acknowledges without re-executing.
- **Stock Movement Vectors**: Stock is reconciled using transactional delta movements (`quantity_change`), not direct scalar replacement (`current_quantity = X`). This prevents silent data stomping when two devices sell offline simultaneously.
- **Conflict Handling**: If an offline sale reduces stock beyond available physical inventory due to parallel sales, the server records the sale, flags a `sync_conflict` item for manager review, and logs the discrepancy in the Audit Trail.
- **Automatic Sync Listener**: Monitors `navigator.onLine` and initiates sync when reconnected. Includes an immediate manual "Sync Now" trigger with real-time progress indicators (Pending, Syncing, Synced, Conflict).

---

## 6. Authentication & Roles
- **Roles**:
  - `ADMIN`: Unrestricted access across ERP, configurations, audit trails, and financial statements.
  - `MANAGER`: Access to POS, Sales, Purchases, Inventory, Customers, Suppliers, Reports, and Discounts.
  - `CASHIER`: Fast POS terminal, Sales history, Customer lookup, Returns & Receipts.
  - `INVENTORY_STAFF`: Product variant matrix, Stock intake, Supplier POs, Stock adjustments.
- **Session**: Secure bearer token stored in memory & localStorage.

---

## 7. Workflows
- **POS Checkout**: Barcode Scan -> Instant Variant Resolution -> Pricing & Matrix Verification -> Split/Credit Tender -> Atomic Stock Deduction -> Receipt Render.
- **Variant Matrix**: Products define base attributes (Fabric, Gender, Season, Brand). The Variant Matrix combines Sizes and Colors into unique SKUs, barcodes, and stock counters.
- **True COGS**: Profit = `Sale Price - Purchase Unit Cost Recorded At Movement Time - Direct Expenses`. Accurately accounts for historic inventory cost layers.
- **Receipts**: Dual-mode rendering: standard A4 formal invoice and 58mm/80mm ESC/POS compatible thermal slips with barcode and QR receipt validation.
