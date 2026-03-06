# Cursor Prompt — WMS Add-On Features
## Barcode Scanning + PDF Invoices + Email Alerts + Purchase Orders + GRN + Audit Logs

> **Context**: This prompt extends the existing Warehouse Management System (React + PHP + MySQL).
> All new features must integrate seamlessly with the existing codebase, database, and design system.
> Do NOT rewrite existing files unless adding new columns, routes, or imports.

---

## 1. 📦 BARCODE SCANNING

### Overview
Enable staff to scan product barcodes using a USB barcode scanner or device camera to instantly look up, receive, or dispatch stock — without typing.

---

### Database Changes

```sql
-- Add barcode column to products
ALTER TABLE products ADD COLUMN barcode VARCHAR(100) UNIQUE NULL AFTER sku;
ALTER TABLE products ADD COLUMN barcode_type ENUM('CODE128','CODE39','EAN13','QR') DEFAULT 'CODE128' AFTER barcode;

-- Create barcode scan log
CREATE TABLE barcode_scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  scanned_by INT NOT NULL,
  action ENUM('LOOKUP','STOCK_IN','STOCK_OUT','ORDER_PICK') NOT NULL,
  quantity INT DEFAULT 1,
  reference VARCHAR(100),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (scanned_by) REFERENCES users(id)
);
```

---

### PHP Backend

**`api/barcode/lookup.php`** — GET `?code=XXXXXX`
- Search products where `barcode = ?` OR `sku = ?`
- Return full product info: id, name, sku, barcode, stock_quantity, min_stock_level, location, unit, cost_price, selling_price, category name, zone name
- Log the scan in `barcode_scans` with action = LOOKUP
- Return 404 JSON error if not found

**`api/barcode/generate.php`** — POST
- Body: `{ product_id, barcode_type }`
- If product has no barcode: auto-generate one (format: `WMS-{product_id}-{random 6 digits}`)
- Update `products.barcode` and `products.barcode_type`
- Return updated product

**`api/barcode/print.php`** — POST
- Body: `{ product_ids: [1,2,3], copies: 1 }`
- Fetch products with barcodes
- Generate HTML response (print-ready, not PDF) with barcode labels laid out in a grid
- Each label: barcode image (use JS rendering on frontend), product name, SKU, price, zone
- Return HTML string for frontend to open in print window

**`api/barcode/scan-log.php`** — GET
- Paginated scan history with filters: product_id, action, user_id, date range
- JOINs to products and users

---

### React Frontend

**`src/components/BarcodeScanner/`**

**`BarcodeScanner.jsx`** — Camera-based scanner component
```
- Use `html5-qrcode` library (npm install html5-qrcode)
- Show camera viewfinder in a modal
- On successful scan: call /api/barcode/lookup.php
- Show product card with name, stock, location
- Action buttons: Stock In | Stock Out | View Product
- Support torch/flashlight toggle on mobile
- Show error state if camera permission denied
- Fallback: manual barcode entry text input with scan icon
```

**`BarcodeInput.jsx`** — USB scanner input (invisible input that captures keystrokes)
```
- Render a hidden input that auto-focuses
- USB scanners type the barcode + press Enter
- Detect scan vs manual typing by keystroke timing (< 50ms between chars = scanner)
- On scan detected: trigger lookup API
- Show visual pulse animation when scan is detected
- Can be mounted globally in Layout.jsx so scanning works on any page
```

**`BarcodeLabelPrint.jsx`** — Label designer & print UI
```
- Select products from searchable multi-select dropdown
- Choose label size: Small (38x25mm) | Medium (50x30mm) | Large (100x50mm)
- Copies per product (1-10)
- Preview grid showing how labels will look
- Render barcodes using `JsBarcode` library (npm install jsbarcode)
- "Print Labels" button: generates print window with proper CSS @media print styles
- Each label shows: barcode graphic, product name (truncated), SKU, price, zone
```

**`src/pages/BarcodeManager.jsx`** — Full page at `/barcode`
```
- Tab 1: Scanner — embed BarcodeScanner + recent scan history table
- Tab 2: Label Printing — embed BarcodeLabelPrint
- Tab 3: Scan Log — table of all barcode_scans with filters
- Tab 4: Bulk Assign — upload CSV with columns [product_id, barcode] to batch-assign barcodes
```

**Add to Sidebar navigation:** Barcode icon + "Barcode" label

**Add to Inventory page:**
- Barcode column in product table (show barcode value, or "Unassigned" badge in red)
- In Add/Edit Product modal: barcode field + "Auto-generate" button
- Scan-to-search: clicking search bar shows option "Scan barcode instead"

---

## 2. 🧾 PDF INVOICE GENERATION

### Overview
Generate professional, branded PDF invoices and delivery notes for outbound orders and supplier invoices for inbound orders. Uses **DomPDF** (PHP library).

---

### PHP Setup

```bash
# In backend/ run:
composer require dompdf/dompdf
```

Add `backend/vendor/autoload.php` require to all invoice PHP files.

---

### Database Changes

```sql
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,  -- format: INV-2024-00001
  order_id INT NOT NULL,
  type ENUM('INVOICE','DELIVERY_NOTE','PURCHASE_ORDER','GRN') NOT NULL,
  status ENUM('DRAFT','SENT','PAID','VOID') DEFAULT 'DRAFT',
  issued_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  footer_text TEXT,
  pdf_path VARCHAR(500),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE company_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  company_website VARCHAR(255),
  tax_number VARCHAR(100),
  currency_symbol VARCHAR(10) DEFAULT '$',
  currency_code VARCHAR(5) DEFAULT 'USD',
  invoice_prefix VARCHAR(20) DEFAULT 'INV',
  invoice_footer TEXT,
  logo_path VARCHAR(500),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company settings
INSERT INTO company_settings (company_name, company_address, company_email, currency_symbol)
VALUES ('My Warehouse Co.', '123 Warehouse Street, City, Country', 'info@warehouse.com', '$');
```

---

### PHP Backend

**`api/invoices/generate.php`** — POST
- Body: `{ order_id, type, tax_rate, discount_amount, due_date, notes, footer_text }`
- Fetch order + order_items + product details + company_settings
- Auto-generate invoice_number: `{prefix}-{YEAR}-{5-digit sequence}` (query MAX id to get next)
- Insert into invoices table
- Render HTML invoice template (see template below)
- Convert to PDF using DomPDF: `$dompdf->loadHtml($html); $dompdf->render();`
- Save PDF to `backend/storage/invoices/INV-2024-00001.pdf`
- Update invoices.pdf_path
- Return `{ invoice_id, invoice_number, pdf_url }`

**`api/invoices/download.php`** — GET `?id=X`
- Verify JWT
- Fetch invoice record
- Stream PDF file with headers:
  ```php
  header('Content-Type: application/pdf');
  header('Content-Disposition: attachment; filename="' . $invoice_number . '.pdf"');
  readfile($pdf_path);
  ```

**`api/invoices/preview.php`** — GET `?id=X`
- Same as download but `Content-Disposition: inline` (opens in browser)

**`api/invoices/index.php`** — GET
- Paginated invoice list with filters: type, status, date range, order_id
- Includes order_number, customer name

**`api/invoices/update-status.php`** — PUT
- Body: `{ id, status }` — update invoice status (DRAFT → SENT → PAID)

**`api/invoices/settings.php`** — GET / PUT
- GET: return company_settings row
- PUT: update company settings (name, address, logo, currency, etc.)

---

### PDF HTML Template

Create `backend/templates/invoice.html.php` — a clean, professional invoice template:

```
Layout:
┌─────────────────────────────────────────────┐
│  [LOGO]          INVOICE                    │
│  Company Name    Invoice #: INV-2024-00001  │
│  Address         Date: Jan 15, 2024         │
│  Phone/Email     Due: Feb 15, 2024          │
├──────────────────┬──────────────────────────┤
│  BILL TO         │  SHIP TO / FROM          │
│  Customer name   │  Warehouse address       │
│  Contact info    │                          │
├──────────────────┴──────────────────────────┤
│  # │ SKU │ Product │ Qty │ Unit Price │ Total│
│  1 │ ... │ ...     │ 10  │ $50.00     │$500  │
│  2 │ ... │ ...     │  5  │ $20.00     │$100  │
├─────────────────────────────────────────────┤
│                        Subtotal:    $600.00 │
│                        Tax (15%):    $90.00 │
│                        Discount:    -$10.00 │
│                        TOTAL:       $680.00 │
├─────────────────────────────────────────────┤
│  Notes: ...                                 │
│  Thank you for your business!               │
└─────────────────────────────────────────────┘

Styling:
- Clean white background
- Company accent color: #1E40AF (blue) for header bar and totals row
- Professional font: DejaVu Sans (DomPDF safe)
- Table: light gray striped rows, bold header
- Footer: page number, company tagline
- Status watermark: if status=PAID show green diagonal "PAID" watermark
- if status=VOID show red diagonal "VOID" watermark
```

Also create `backend/templates/delivery_note.html.php` — simpler version without prices, focused on items and quantities for warehouse pickers.

---

### React Frontend

**`src/components/Invoice/`**

**`InvoiceGenerator.jsx`** — Modal triggered from Order detail view
```
- Form fields: Invoice Type (Invoice / Delivery Note), Tax Rate %, Discount Amount, Due Date, Notes
- Live preview panel: show calculated subtotal, tax, discount, total as user types
- "Generate PDF" button → calls generate API → shows success with download link
- Loading spinner during generation
```

**`InvoiceList.jsx`** — Table component showing all invoices
```
- Columns: Invoice #, Type, Order #, Customer, Date, Due Date, Amount, Status, Actions
- Status badge: DRAFT=gray, SENT=blue, PAID=green, VOID=red
- Actions: Download PDF, Preview (open in new tab), Mark as Paid, Void
- Filter by type, status, date range
```

**`src/pages/Invoices.jsx`** — Full page at `/invoices`
```
- Top: KPI cards — Total Invoiced, Total Paid, Total Outstanding, Overdue count
- InvoiceList table below
- "Company Settings" button top-right → modal to update logo, name, address, tax number, currency
```

**Add to Order detail view:**
- "Generate Invoice" button → opens InvoiceGenerator modal
- "Invoices" section at bottom showing all invoices linked to that order
- Each invoice row has Download and Preview buttons

**Add to Sidebar:** Receipt icon + "Invoices" label

---

## 3. 📧 EMAIL ALERTS FOR LOW STOCK

### Overview
Automatically send email notifications when product stock falls to or below the minimum stock level. Uses PHP's built-in `mail()` or PHPMailer for SMTP.

---

### PHP Setup

```bash
composer require phpmailer/phpmailer
```

---

### Database Changes

```sql
CREATE TABLE email_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  smtp_host VARCHAR(255),
  smtp_port INT DEFAULT 587,
  smtp_username VARCHAR(255),
  smtp_password VARCHAR(255),
  smtp_encryption ENUM('tls','ssl','none') DEFAULT 'tls',
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE alert_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  alert_type ENUM('LOW_STOCK','OUT_OF_STOCK','ORDER_STATUS','DAILY_SUMMARY','WEEKLY_REPORT') NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_sub (user_id, alert_type)
);

CREATE TABLE alert_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  product_id INT,
  order_id INT,
  status ENUM('SENT','FAILED','SKIPPED') NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE alert_thresholds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,            -- NULL means applies to all products
  alert_type ENUM('LOW_STOCK','OUT_OF_STOCK') NOT NULL,
  threshold_override INT,    -- NULL means use product.min_stock_level
  cooldown_hours INT DEFAULT 24,  -- don't re-alert for same product within X hours
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Insert default subscriptions for admin users
INSERT INTO alert_subscriptions (user_id, alert_type)
SELECT id, 'LOW_STOCK' FROM users WHERE role = 'admin';
INSERT INTO alert_subscriptions (user_id, alert_type)
SELECT id, 'OUT_OF_STOCK' FROM users WHERE role = 'admin';
```

---

### PHP Backend

**`helpers/mailer.php`** — Mailer helper class
```php
class Mailer {
  private $mail;

  public function __construct() {
    // Load email_settings from DB
    // Configure PHPMailer with SMTP settings
    // If no SMTP configured, use PHP mail() as fallback
  }

  public function send(string $to, string $toName, string $subject, string $htmlBody): bool {
    // Set recipient, subject, body
    // Try send, catch exception, return bool
  }

  public function sendTemplate(string $template, array $data, string $to, string $toName, string $subject): bool {
    // Load template file, replace placeholders, call send()
  }
}
```

**`helpers/alert_checker.php`** — Core alert logic
```php
function checkLowStockAlerts(PDO $pdo): array {
  // Find all products where stock_quantity <= min_stock_level AND is_active = 1
  // For each product, check alert_log: was an alert sent in the last cooldown_hours?
  // If no recent alert: get all subscribed users for LOW_STOCK alert type
  // Send email to each subscriber
  // Log result in alert_log
  // Return array of alerts sent
}

function checkOutOfStockAlerts(PDO $pdo): array {
  // Same but stock_quantity = 0
}

function sendDailySummary(PDO $pdo): void {
  // Compile: total movements today, new orders, low stock count, out of stock count
  // Send summary email to all DAILY_SUMMARY subscribers
}
```

**`api/alerts/check.php`** — POST (called by cron OR manually triggered)
- Require JWT (admin only)
- Call `checkLowStockAlerts()` and `checkOutOfStockAlerts()`
- Return `{ alerts_sent: N, details: [...] }`

**`api/alerts/cron.php`** — No JWT (secured by secret token in query param `?token=SECRET`)
- Called by server cron job every 30 minutes
- Runs all alert checks
- Does NOT return JSON — exits silently
- Cron command: `*/30 * * * * curl "http://localhost/backend/api/alerts/cron.php?token=YOUR_CRON_SECRET"`

**`api/alerts/settings.php`** — GET / PUT
- GET: return email_settings (mask smtp_password)
- PUT: update SMTP settings, test connection

**`api/alerts/test.php`** — POST
- Body: `{ email }` — send a test email to verify SMTP works
- Return success/fail with error message

**`api/alerts/subscriptions.php`** — GET / PUT
- GET: return current user's alert subscriptions
- PUT: toggle subscription on/off

**`api/alerts/log.php`** — GET
- Paginated alert log with filters: alert_type, status, date range, product_id
- Admin only

---

### Email Templates

Create `backend/templates/emails/` folder:

**`low_stock_alert.html`**
```html
<!-- Professional HTML email template -->
Subject: ⚠️ Low Stock Alert — {product_name} ({sku})

Body:
- Orange header bar with warning icon
- "Stock Alert" title
- Product card: name, SKU, category, zone, current stock (in red), minimum stock, shortage amount
- "Reorder Now" CTA button (links to WMS orders page)
- Table of ALL other low-stock items (if any) as secondary info
- Footer: sent by WMS, unsubscribe link, timestamp
```

**`out_of_stock_alert.html`**
```html
Subject: 🚨 OUT OF STOCK — {product_name} ({sku})

Body:
- Red header bar
- "Critical: Product Out of Stock"
- Product details prominently
- Last 5 stock movements for this product
- "Create Purchase Order" CTA button
- Footer
```

**`daily_summary.html`**
```html
Subject: 📊 Daily WMS Summary — {date}

Body:
- Green header: "Daily Warehouse Summary"
- 4 stat boxes: Stock IN today, Stock OUT today, New Orders, Active Alerts
- Low stock items table (up to 10 rows)
- Pending orders needing action
- Footer
```

---

### React Frontend

**`src/pages/AlertSettings.jsx`** — page at `/settings/alerts`

**Tab 1: SMTP Configuration**
```
- Form: SMTP Host, Port, Username, Password (masked), Encryption dropdown, From Email, From Name
- "Test Connection" button → sends test email → shows success/fail toast
- Save Settings button
- Status indicator: Connected ✓ / Not configured ✗
```

**Tab 2: My Subscriptions**
```
- Toggle switches for each alert type:
  ☑ Low Stock Alerts
  ☑ Out of Stock Alerts  
  ☐ Order Status Changes
  ☐ Daily Summary (sent at 8am)
  ☐ Weekly Report (sent Monday 8am)
- Save Preferences button
```

**Tab 3: Alert Log**
```
- Table: Date, Alert Type, Product, Recipient, Status (Sent/Failed), Error
- Filter by date range and status
- "Run Alert Check Now" button (triggers manual check, admin only)
```

**Tab 4: Thresholds**
```
- Global cooldown setting (default 24 hours between repeat alerts for same product)
- Per-product overrides table: search product, set custom threshold, set custom cooldown
- Add/edit/delete overrides
```

**Add to Dashboard:**
- "Alert Notifications" bell icon in topbar with badge count of active low-stock alerts
- Clicking opens dropdown showing top 5 low-stock products with quick "Create PO" link
- Alert banner below topbar if any products are OUT OF STOCK (dismissible per session)

**Add to Settings page sidebar:** Bell icon + "Alert Settings"

---

## 4. 📋 PURCHASE ORDER (PO) + GOODS RECEIPT NOTE (GRN) WORKFLOW

### Overview
Full procurement cycle: Create PO → Send to Supplier → Receive Goods (GRN) → Auto-update stock → Close PO.

---

### Database Changes

```sql
CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,   -- format: PO-2024-00001
  supplier_id INT NOT NULL,
  status ENUM('DRAFT','SUBMITTED','ACKNOWLEDGED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED') DEFAULT 'DRAFT',
  priority ENUM('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  shipping_address TEXT,
  billing_address TEXT,
  payment_terms VARCHAR(100),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  terms_conditions TEXT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  notes TEXT,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE goods_receipt_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_number VARCHAR(50) UNIQUE NOT NULL,  -- format: GRN-2024-00001
  po_id INT NOT NULL,
  supplier_id INT NOT NULL,
  status ENUM('DRAFT','CONFIRMED','DISCREPANCY') DEFAULT 'DRAFT',
  received_date DATE NOT NULL,
  delivery_note_number VARCHAR(100),   -- supplier's delivery note ref
  received_by INT NOT NULL,
  confirmed_by INT,
  confirmed_at TIMESTAMP NULL,
  notes TEXT,
  discrepancy_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (received_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id)
);

CREATE TABLE grn_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_id INT NOT NULL,
  po_item_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_expected INT NOT NULL,
  quantity_received INT NOT NULL,
  quantity_accepted INT NOT NULL,     -- after inspection (may differ if damaged)
  quantity_rejected INT DEFAULT 0,
  rejection_reason TEXT,
  unit_cost DECIMAL(10,2) NOT NULL,
  zone_id INT,                        -- where to put received stock
  FOREIGN KEY (grn_id) REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (zone_id) REFERENCES warehouse_zones(id)
);

CREATE TABLE po_approval_workflow (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL,
  step INT NOT NULL,                  -- 1, 2, 3...
  action ENUM('SUBMITTED','APPROVED','REJECTED','REVISED') NOT NULL,
  performed_by INT NOT NULL,
  comments TEXT,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);
```

---

### PHP Backend

**`api/purchase-orders/index.php`** — GET / POST
- GET: paginated POs with JOINs to suppliers, created_by user, item count, total. Filters: status, supplier_id, priority, date range, search by PO number
- POST: create PO in transaction — insert PO, insert all po_items, calculate and update subtotal/total on PO

**`api/purchase-orders/single.php?id=X`** — GET / PUT / DELETE
- GET: full PO with supplier details, all items with product info, approval workflow history, linked GRNs
- PUT: update PO (only if status = DRAFT). Body can update fields or just `{ status: 'SUBMITTED' }` to submit for approval
- DELETE: soft cancel if status = DRAFT or SUBMITTED only

**`api/purchase-orders/approve.php`** — POST
- Body: `{ po_id, action: 'APPROVED'|'REJECTED', comments }`
- Admin/manager role only
- Insert into po_approval_workflow
- If APPROVED: update PO status to ACKNOWLEDGED
- If REJECTED: update PO status to DRAFT, notify creator
- Return updated PO

**`api/purchase-orders/pdf.php`** — GET `?id=X`
- Generate PDF of Purchase Order using DomPDF
- Template similar to invoice: company logo, PO number, supplier details, items table, totals, terms
- Stream as download

**`api/grn/index.php`** — GET / POST
- GET: paginated GRNs with filters: po_id, supplier_id, status, date range
- POST (create GRN): 
  ```
  Body: { po_id, received_date, delivery_note_number, notes, items: [{po_item_id, product_id, quantity_received, quantity_accepted, quantity_rejected, rejection_reason, zone_id}] }
  
  Transaction:
  1. Validate PO exists and status is ACKNOWLEDGED or PARTIALLY_RECEIVED
  2. Insert GRN record
  3. Insert grn_items
  4. For each accepted item:
     a. Insert stock_movement (type=IN, reference=GRN number)
     b. Update product.stock_quantity += quantity_accepted
     c. Update po_items.quantity_received += quantity_received
  5. Recalculate PO status:
     - If all items fully received: status = RECEIVED
     - If some received: status = PARTIALLY_RECEIVED
  6. Commit transaction
  ```

**`api/grn/single.php?id=X`** — GET / PUT
- GET: full GRN with PO info, supplier, all items, stock movements created
- PUT: confirm GRN (status DRAFT → CONFIRMED, admin/manager only)

**`api/grn/discrepancy.php`** — POST
- Body: `{ grn_id, discrepancy_notes }`
- Flag GRN as DISCREPANCY, notify manager via email alert

---

### React Frontend

**`src/pages/PurchaseOrders.jsx`** — page at `/purchase-orders`

**Top Stats Bar:**
```
Draft POs | Submitted POs | Pending Delivery | Total PO Value (month)
```

**PO Table:**
```
Columns: PO Number, Supplier, Priority badge, Status badge, Items, Total Amount, Expected Delivery, Created By, Actions
Status colors: DRAFT=gray, SUBMITTED=blue, ACKNOWLEDGED=purple, PARTIALLY_RECEIVED=amber, RECEIVED=green, CANCELLED=red
Priority colors: LOW=gray, NORMAL=blue, HIGH=orange, URGENT=red
Actions: View | Edit (if DRAFT) | Approve (if SUBMITTED, admin) | Download PDF | Create GRN (if ACKNOWLEDGED/PARTIALLY)
```

**Create PO Modal (multi-step):**
```
Step 1 — Supplier & Details:
  - Supplier dropdown (searchable, shows contact info when selected)
  - Priority selector (Low/Normal/High/Urgent) with color indicators
  - Expected Delivery Date picker
  - Payment Terms text input
  - Shipping Address (auto-fill from company settings, editable)
  - Notes

Step 2 — Add Items:
  - Product search dropdown (shows current stock level next to each option)
  - Quantity to order (show recommended quantity: max_stock - current_stock)
  - Unit cost (auto-filled from product.cost_price, editable)
  - Line total calculated
  - Add multiple rows (+ Add Item button)
  - Remove row button (trash icon)
  - Running subtotal, tax, total shown at bottom

Step 3 — Review & Terms:
  - Full order summary
  - Terms & Conditions textarea
  - Two buttons: "Save as Draft" | "Submit for Approval"
```

**PO Detail View (slide-over or full page `/purchase-orders/:id`):**
```
- PO header card: all details, status badge, priority badge
- Approval Timeline: visual stepper showing DRAFT → SUBMITTED → ACKNOWLEDGED
- If status=SUBMITTED and user=admin: Approve / Reject buttons with comment input
- Items table: product, ordered qty, received qty (progress bar), unit cost, total
- Linked GRNs section: table of all GRNs for this PO
- "Create GRN" button (if status allows)
- "Download PO PDF" button
- Action log / comments at bottom
```

**`src/pages/GoodsReceipt.jsx`** — page at `/goods-receipt`

**GRN Table:**
```
Columns: GRN Number, PO Number, Supplier, Received Date, Items, Status, Received By, Actions
Status: DRAFT=gray, CONFIRMED=green, DISCREPANCY=red
Actions: View | Confirm (admin) | Flag Discrepancy
```

**Create GRN Modal (triggered from PO detail view):**
```
- PO Number (pre-filled, read-only)
- Supplier (pre-filled, read-only)
- Received Date (date picker, default today)
- Delivery Note Number (supplier's reference)
- Notes

Items table (pre-filled from PO items):
  Columns: Product | Expected Qty | Received Qty (editable) | Accepted Qty (editable) | Rejected Qty (auto: received - accepted) | Rejection Reason (shows if rejected > 0) | Zone (dropdown)
  - Each row: if received < expected, highlight row amber
  - If accepted < received, show rejection reason field

Submit: "Record Receipt" button
- On success: show stock movements created, update PO status
- Show summary: X items received, Y accepted, Z rejected
```

**GRN Detail View:**
```
- GRN info card
- Items table showing expected vs received vs accepted vs rejected
- Stock movements created (list with links to product)
- Discrepancy notes section
- "Confirm Receipt" button (admin, changes status to CONFIRMED)
- "Flag Discrepancy" button (adds discrepancy notes, sends email alert)
```

**Add to Sidebar:** ClipboardList icon + "Purchase Orders" and FileCheck icon + "Goods Receipt"

---

## 5. 🔍 AUDIT LOGS

### Overview
Track every significant action performed in the system: who did what, when, on which record, and what changed (before/after values).

---

### Database Changes

```sql
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- BIGINT for large volume
  user_id INT,
  user_name VARCHAR(255),               -- denormalized: store name at time of action
  user_role VARCHAR(50),
  action ENUM(
    'LOGIN','LOGOUT','LOGIN_FAILED',
    'CREATE','UPDATE','DELETE','VIEW',
    'STOCK_IN','STOCK_OUT','STOCK_ADJUST',
    'ORDER_CREATE','ORDER_STATUS_CHANGE','ORDER_DELETE',
    'PO_CREATE','PO_SUBMIT','PO_APPROVE','PO_REJECT',
    'GRN_CREATE','GRN_CONFIRM',
    'INVOICE_GENERATE','INVOICE_VOID',
    'USER_CREATE','USER_UPDATE','USER_DELETE',
    'SETTINGS_CHANGE','EXPORT','PRINT','BARCODE_SCAN'
  ) NOT NULL,
  module VARCHAR(50) NOT NULL,          -- 'products','orders','stock','users','settings', etc.
  record_id INT,                        -- ID of the affected record
  record_label VARCHAR(255),            -- Human-readable: "Product: Laptop Pro (P001)"
  old_values JSON,                      -- State before change
  new_values JSON,                      -- State after change
  changed_fields JSON,                  -- Array of field names that changed
  ip_address VARCHAR(45),               -- IPv4 or IPv6
  user_agent TEXT,
  request_method VARCHAR(10),
  request_url VARCHAR(500),
  status ENUM('SUCCESS','FAILED') DEFAULT 'SUCCESS',
  error_message TEXT,
  duration_ms INT,                      -- how long the action took
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_module (module),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_record (module, record_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

---

### PHP Backend

**`helpers/audit.php`** — Audit logger helper

```php
class AuditLogger {

  public static function log(array $params): void {
    // $params: action, module, record_id, record_label, old_values, new_values, status, error_message
    // Auto-detect: user from JWT, ip from $_SERVER, user_agent, request method/url
    // Calculate changed_fields by diffing old_values and new_values
    // INSERT into audit_logs (non-blocking — catch any DB error silently so it never breaks main flow)
  }

  public static function diff(array $old, array $new): array {
    // Return array of keys that changed between old and new
  }

  public static function logAuth(string $action, int $userId, string $email, bool $success): void {
    // Specialized for LOGIN/LOGOUT/LOGIN_FAILED
  }
}
```

**Integration — add audit logging to ALL existing endpoints:**

In every PHP file that modifies data, add after successful DB operation:
```php
AuditLogger::log([
  'action'       => 'UPDATE',
  'module'       => 'products',
  'record_id'    => $product_id,
  'record_label' => "Product: {$product['name']} ({$product['sku']})",
  'old_values'   => $old_product,
  'new_values'   => $updated_product,
  'status'       => 'SUCCESS'
]);
```

Specifically add to:
- `auth/login.php` → LOGIN / LOGIN_FAILED
- `auth/logout.php` → LOGOUT
- `products/` → CREATE, UPDATE, DELETE
- `stock/` → STOCK_IN, STOCK_OUT, STOCK_ADJUST
- `orders/` → ORDER_CREATE, ORDER_STATUS_CHANGE, ORDER_DELETE
- `purchase-orders/` → PO_CREATE, PO_SUBMIT, PO_APPROVE, PO_REJECT
- `grn/` → GRN_CREATE, GRN_CONFIRM
- `invoices/` → INVOICE_GENERATE, INVOICE_VOID
- `api/users/` → USER_CREATE, USER_UPDATE, USER_DELETE
- `alerts/settings.php` → SETTINGS_CHANGE
- `barcode/` → BARCODE_SCAN
- Any export/print endpoint → EXPORT, PRINT

**`api/audit/index.php`** — GET (admin only)
- Paginated audit logs
- Filters: user_id, action, module, status, date range (required — default last 7 days), record_id
- Search: by user_name, record_label, ip_address
- Sort: created_at DESC (default)
- Returns logs with user info joined

**`api/audit/stats.php`** — GET (admin only)
- Actions count by type (last 30 days)
- Most active users
- Most modified modules
- Failed actions count
- Login attempts (success vs failed) per day

**`api/audit/export.php`** — GET (admin only)
- Export filtered audit logs as CSV
- Columns: Date/Time, User, Role, Action, Module, Record, Changed Fields, IP, Status

---

### React Frontend

**`src/pages/AuditLog.jsx`** — page at `/audit-log` (admin only)

**Stats Bar (top):**
```
Today's Actions | Active Users Today | Failed Actions | Most Active Module
```

**Filters Bar:**
```
Date Range (required, default last 7 days) | User dropdown | Module dropdown | Action dropdown | Status (Success/Failed) | Search box
```

**Audit Table:**
```
Columns: Timestamp, User (avatar + name + role badge), Action (colored badge), Module, Record, IP Address, Status, Details
- Timestamp: show relative time ("2 hours ago") with full datetime on hover tooltip
- Action badge colors:
  LOGIN/LOGOUT = gray
  CREATE = green
  UPDATE = blue
  DELETE = red
  STOCK_IN = emerald
  STOCK_OUT = orange
  ORDER_* = purple
  PO_* = indigo
  LOGIN_FAILED = red
- Row click → expand to show full details panel below row (accordion)
```

**Expanded Row Detail Panel:**
```
Two-column layout:
Left: Action info (user, IP, user agent, timestamp, duration, request URL)
Right: Changes diff view
  - If old_values and new_values exist: show side-by-side diff table
    Field | Before | After
    name  | Laptop | Laptop Pro  ← highlight changed fields
    stock | 10     | 15          ← green if increased, red if decreased
  - If CREATE: show "New Record" with all new_values
  - If DELETE: show "Deleted Record" with old_values in red
  - If AUTH action: show login details only
```

**`src/components/AuditLog/ActivityFeed.jsx`** — mini component for Dashboard
```
- Show last 10 audit log entries in a compact feed style
- Each entry: avatar circle with user initials, action badge, description, relative time
- "View All" link to full audit log page
- Auto-refreshes every 60 seconds
```

**`src/components/AuditLog/RecordHistory.jsx`** — reusable component
```
- Props: module, record_id
- Shows audit history for a specific record (e.g., all changes to Product ID 5)
- Used in: Product detail panel, Order detail, PO detail
- Compact timeline showing who changed what and when
```

**Add to Dashboard:** ActivityFeed component in bottom-right card
**Add to Sidebar:** Shield icon + "Audit Log" (admin only — hide for staff role)
**Add to Product detail, Order detail, PO detail, GRN detail:** RecordHistory component at bottom

---

## NEW PACKAGES TO INSTALL

**Frontend (add to `package.json`):**
```json
{
  "html5-qrcode": "^2.3.8",
  "jsbarcode": "^3.11.6",
  "date-fns": "^3.0.0",
  "react-datepicker": "^6.0.0",
  "react-to-print": "^2.15.0"
}
```

**Backend (add to `composer.json`):**
```json
{
  "require": {
    "dompdf/dompdf": "^2.0",
    "phpmailer/phpmailer": "^6.9"
  }
}
```

---

## NEW SIDEBAR NAVIGATION STRUCTURE

Update `Sidebar.jsx` with these additions:

```
📊 Dashboard
📦 Inventory
↕️  Stock Movements
🛒 Orders
─────────────────
📋 Purchase Orders       ← NEW
✅ Goods Receipt (GRN)   ← NEW
─────────────────
🧾 Invoices              ← NEW
📊 Reports
─────────────────
📷 Barcode Manager       ← NEW
─────────────────
🔔 Alert Settings        ← NEW (Settings section)
🔍 Audit Log             ← NEW (Admin only)
👤 User Management
⚙️  Company Settings
```

---

## UPDATED DATABASE MIGRATION FILE

Create `database/migrations/002_addon_features.sql`:
```sql
-- Run AFTER warehouse.sql
-- Contains all ALTER TABLE and CREATE TABLE statements from this prompt
-- In order: barcode columns, invoices, email_settings, alert tables, purchase_orders, grn, audit_logs
-- End with seed data for company_settings and default alert_subscriptions
```

---

## README ADDITIONS

Add to `README.md`:

```markdown
## New Features Setup

### Email Alerts
1. Configure SMTP in Settings → Alert Settings
2. Set up cron job: `*/30 * * * * curl "http://yoursite.com/backend/api/alerts/cron.php?token=YOUR_SECRET"`
3. Staff subscribe to alerts in Settings → My Subscriptions

### Barcode Scanning
- USB scanners work automatically on any page (plug and play)
- Camera scanning requires HTTPS in production (browser security requirement)
- Generate barcodes for products in Inventory → Edit Product

### PDF Generation
- Ensure `backend/storage/invoices/` directory is writable: `chmod 755 backend/storage/invoices/`
- Run `composer install` in the backend/ directory

### Purchase Order Workflow
- Approval required: Staff create POs → Manager/Admin approves → Status becomes ACKNOWLEDGED
- To skip approval (small teams): set PO status directly to ACKNOWLEDGED in settings
```

---

## FINAL CHECKLIST

Cursor must produce ALL new files and modifications:

- [ ] `database/migrations/002_addon_features.sql`
- [ ] `backend/helpers/mailer.php`
- [ ] `backend/helpers/audit.php`
- [ ] `backend/templates/invoice.html.php`
- [ ] `backend/templates/delivery_note.html.php`
- [ ] `backend/templates/emails/low_stock_alert.html`
- [ ] `backend/templates/emails/out_of_stock_alert.html`
- [ ] `backend/templates/emails/daily_summary.html`
- [ ] All new API endpoint files (barcode/, invoices/, alerts/, purchase-orders/, grn/, audit/)
- [ ] `frontend/src/components/BarcodeScanner/BarcodeScanner.jsx`
- [ ] `frontend/src/components/BarcodeScanner/BarcodeInput.jsx`
- [ ] `frontend/src/components/BarcodeScanner/BarcodeLabelPrint.jsx`
- [ ] `frontend/src/components/Invoice/InvoiceGenerator.jsx`
- [ ] `frontend/src/components/Invoice/InvoiceList.jsx`
- [ ] `frontend/src/components/AuditLog/ActivityFeed.jsx`
- [ ] `frontend/src/components/AuditLog/RecordHistory.jsx`
- [ ] `frontend/src/pages/BarcodeManager.jsx`
- [ ] `frontend/src/pages/Invoices.jsx`
- [ ] `frontend/src/pages/AlertSettings.jsx`
- [ ] `frontend/src/pages/PurchaseOrders.jsx`
- [ ] `frontend/src/pages/GoodsReceipt.jsx`
- [ ] `frontend/src/pages/AuditLog.jsx`
- [ ] Updated `Sidebar.jsx` with new navigation items
- [ ] Updated `App.jsx` with new routes
- [ ] Updated `package.json` and `composer.json` with new dependencies

Every file must be complete and production-ready. No placeholders.
