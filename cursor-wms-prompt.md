# Cursor Prompt — Production-Ready Warehouse Management System (React + PHP + MySQL)

---

## PROJECT OVERVIEW

Build a **full-stack, production-ready Warehouse Management System (WMS)** using:
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6
- **Backend**: Plain PHP 8.2 (REST API, no framework)
- **Database**: MySQL 8.0
- **Auth**: JWT (via PHP)
- **HTTP Client**: Axios

The system must be fully functional, not a demo. Every button, form, table, and chart must work end-to-end with real data from the MySQL database via PHP API calls.

---

## FOLDER STRUCTURE

```
warehouse-wms/
├── frontend/                        ← React (Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/                     ← All Axios API calls
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── stock.js
│   │   │   ├── orders.js
│   │   │   └── reports.js
│   │   ├── components/              ← Reusable UI components
│   │   │   ├── Layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Topbar.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── UI/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Table.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Select.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Spinner.jsx
│   │   │   │   └── Toast.jsx
│   │   │   └── Charts/
│   │   │       ├── StockBarChart.jsx
│   │   │       ├── OrderLineChart.jsx
│   │   │       └── CategoryPieChart.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── StockMovements.jsx
│   │   │   ├── Orders.jsx
│   │   │   └── Reports.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── usePagination.js
│   │   │   └── useToast.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   ├── formatters.js        ← Date, currency, number formatters
│   │   │   └── validators.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                         ← PHP REST API
│   ├── config/
│   │   ├── db.php                   ← PDO MySQL connection
│   │   └── cors.php                 ← CORS headers
│   ├── middleware/
│   │   └── auth.php                 ← JWT verification middleware
│   ├── helpers/
│   │   ├── response.php             ← JSON response helpers
│   │   └── jwt.php                  ← JWT encode/decode
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.php
│   │   │   └── logout.php
│   │   ├── products/
│   │   │   ├── index.php            ← GET all / POST create
│   │   │   └── [id].php             ← GET one / PUT update / DELETE
│   │   ├── stock/
│   │   │   ├── index.php            ← GET movements / POST new movement
│   │   │   └── adjust.php           ← Manual stock adjustment
│   │   ├── orders/
│   │   │   ├── index.php            ← GET all / POST create
│   │   │   ├── [id].php             ← GET one / PUT update status
│   │   │   └── items.php            ← GET order line items
│   │   └── reports/
│   │       ├── summary.php          ← KPI summary
│   │       ├── stock-levels.php     ← Stock by category/zone
│   │       ├── movements.php        ← In/out over time
│   │       └── orders-trend.php     ← Orders over time
│   └── .htaccess                    ← URL rewriting for clean API routes
│
└── database/
    └── warehouse.sql                ← Full schema + seed data
```

---

## DATABASE SCHEMA (MySQL)

Create the following tables in `warehouse.sql`. Include `CREATE DATABASE IF NOT EXISTS warehouse_db;` and `USE warehouse_db;` at the top. Add realistic seed data (at least 20 products, 50 stock movements, 30 orders).

### Tables

**users**
```sql
id, name, email, password_hash, role ENUM('admin','manager','staff'), created_at
```

**categories**
```sql
id, name, description, created_at
```

**suppliers**
```sql
id, name, contact_person, email, phone, address, created_at
```

**warehouse_zones**
```sql
id, name, description, capacity, created_at
```

**products**
```sql
id, sku VARCHAR(50) UNIQUE, name, description, category_id FK, supplier_id FK,
zone_id FK, unit VARCHAR(20), cost_price DECIMAL(10,2), selling_price DECIMAL(10,2),
stock_quantity INT DEFAULT 0, min_stock_level INT DEFAULT 5,
max_stock_level INT DEFAULT 500, image_url, is_active TINYINT(1) DEFAULT 1,
created_at, updated_at
```

**stock_movements**
```sql
id, product_id FK, type ENUM('IN','OUT','ADJUSTMENT','TRANSFER','RETURN'),
quantity INT, previous_quantity INT, new_quantity INT,
reference_number VARCHAR(100), notes TEXT, performed_by FK(users.id),
created_at
```

**orders**
```sql
id, order_number VARCHAR(50) UNIQUE, type ENUM('INBOUND','OUTBOUND'),
status ENUM('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'),
customer_supplier_name VARCHAR(255), customer_supplier_contact VARCHAR(255),
total_amount DECIMAL(12,2), notes TEXT, expected_date DATE,
created_by FK(users.id), created_at, updated_at
```

**order_items**
```sql
id, order_id FK, product_id FK, quantity INT, unit_price DECIMAL(10,2),
total_price DECIMAL(10,2), fulfilled_quantity INT DEFAULT 0
```

---

## FEATURE SPECIFICATIONS

### 1. AUTHENTICATION
- JWT-based login with email + password
- Store token in `localStorage`, attach to every Axios request via interceptor
- Protected routes — redirect to `/login` if no valid token
- Role-based UI: admin sees everything; staff cannot delete or access reports
- Auto logout on token expiry (401 response)
- Login page: clean centered card, email + password fields, show/hide password toggle, loading state on submit, error message display

### 2. DASHBOARD (`/dashboard`)
**KPI Cards (top row):**
- Total Products (with count of low-stock items highlighted in amber)
- Total Stock Value (sum of stock_quantity × cost_price)
- Pending Orders (count of orders where status = PENDING or PROCESSING)
- Stock Movements Today (count of movements created today)

**Charts (middle row):**
- Bar chart: Top 10 products by stock quantity (Recharts)
- Line chart: Stock IN vs OUT over last 30 days (Recharts)
- Pie chart: Stock value by category (Recharts)

**Tables (bottom row):**
- Recent 5 stock movements with product name, type badge, quantity, time
- Low stock alerts: products where stock_quantity <= min_stock_level, with reorder button

All dashboard data fetched from `/api/reports/summary.php` on mount. Show skeleton loaders while loading.

### 3. INVENTORY MANAGEMENT (`/inventory`)
**Features:**
- Data table with columns: SKU, Product Name, Category, Zone, Supplier, Unit, Cost Price, Selling Price, Stock Qty, Min Stock, Status (Active/Inactive), Actions
- Search bar (filters by name or SKU in real time, debounced 300ms)
- Filter dropdowns: Category, Zone, Supplier, Stock Status (All / Low Stock / Out of Stock / In Stock)
- Pagination: 15 rows per page, show total count
- Sortable columns (click header to sort asc/desc)
- **Add Product** button → opens modal with full form:
  - Fields: SKU (auto-generated or manual), Name, Description, Category (dropdown), Supplier (dropdown), Zone (dropdown), Unit, Cost Price, Selling Price, Min Stock Level, Max Stock Level, Active toggle
  - Validation: all required fields, SKU uniqueness check, price must be > 0
  - Success toast on save
- **Edit** button → same modal pre-filled
- **Delete** button → confirmation dialog → soft delete (set is_active = 0) or hard delete with cascade
- **View** button → slide-over panel showing full product details + last 10 stock movements for that product
- Row color coding: red row if out of stock, amber if low stock
- Export to CSV button (client-side, using product data already loaded)

### 4. STOCK IN / OUT MANAGEMENT (`/stock-movements`)
**Features:**
- Movement log table: Movement ID, Date/Time, Product (SKU + Name), Type (colored badge: IN=green, OUT=red, ADJUSTMENT=blue, TRANSFER=purple, RETURN=orange), Qty, Previous Stock, New Stock, Reference #, Performed By, Notes
- Filter by: Date range (date picker), Movement Type, Product (searchable dropdown), Performed By
- Search by reference number
- Pagination: 20 rows per page

**Record Stock IN button → modal:**
  - Product (searchable dropdown with current stock shown)
  - Quantity (positive integer)
  - Reference Number (e.g., PO number)
  - Notes
  - On save: create stock_movement record, update products.stock_quantity, show success toast

**Record Stock OUT button → modal:**
  - Same fields as IN
  - Validate: cannot OUT more than current stock (show inline error)

**Manual Adjustment button → modal:**
  - Product dropdown
  - New quantity (sets stock directly, not relative)
  - Reason (required text)
  - Creates ADJUSTMENT movement record

**Summary bar above table:**
  - Total IN today, Total OUT today, Net Movement today

### 5. ORDERS & SHIPMENTS (`/orders`)
**Features:**
- Tabs: All Orders | Inbound | Outbound
- Orders table: Order #, Type badge, Status badge (color-coded), Customer/Supplier, Items Count, Total Amount, Expected Date, Created, Actions
- Filter by status, type, date range
- Search by order number or customer/supplier name
- Pagination: 15 per page

**Create Order button → multi-step modal:**
  - Step 1: Order type (Inbound/Outbound), Customer/Supplier name & contact, Expected Date, Notes
  - Step 2: Add line items — product search dropdown, quantity, unit price (auto-filled from product), line total calculated. Add multiple items. Show running total.
  - Step 3: Review & confirm
  - On save: create order + order_items records

**Order Detail view (click row):**
  - Full order info card
  - Line items table with fulfillment status
  - Status timeline (visual stepper showing order progress)
  - Update Status button (dropdown of valid next statuses)
  - When status changes to DELIVERED (outbound) or CONFIRMED (inbound): prompt to automatically create stock movement records for all line items
  - Print button (opens print-friendly view)

**Status badge colors:**
  - PENDING = gray, CONFIRMED = blue, PROCESSING = amber, SHIPPED = purple, DELIVERED = green, CANCELLED = red

### 6. REPORTS & ANALYTICS (`/reports`)
**Sections (tabbed or accordion):**

**Inventory Report:**
  - Table: all products with current stock, stock value (qty × cost), % of max capacity
  - Summary: total SKUs, total units, total stock value, count of low-stock items
  - Bar chart: stock value by category
  - Export to CSV

**Stock Movement Report:**
  - Date range selector
  - Line chart: daily IN vs OUT quantities
  - Table: aggregated by product — total IN, total OUT, net change
  - Top 5 most moved products

**Orders Report:**
  - Date range selector
  - KPIs: total orders, total order value, avg order value, fulfilment rate
  - Line chart: orders created per day
  - Pie chart: orders by status
  - Table: orders summary

**Low Stock Report:**
  - All products at or below min_stock_level
  - Shows: Product, SKU, Category, Current Stock, Min Stock, Shortage (min - current), Supplier contact
  - One-click "Create Reorder" button → pre-fills inbound order form

---

## PHP API REQUIREMENTS

### General Rules for ALL PHP files:
```php
<?php
require_once '../../config/cors.php';   // Always first
require_once '../../config/db.php';
require_once '../../middleware/auth.php'; // Verify JWT on protected routes
require_once '../../helpers/response.php';
```

### `config/cors.php`:
```php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
```

### `config/db.php`:
```php
// PDO connection with error mode exception, UTF-8 charset
// Credentials from environment variables or config constants
```

### `helpers/response.php`:
```php
function success($data, $message = 'Success', $code = 200) { ... }
function error($message, $code = 400) { ... }
function paginate($query, $pdo, $page, $limit, $params = []) { ... }
// paginate() runs COUNT(*) then fetches page slice, returns { data, total, page, pages }
```

### `helpers/jwt.php`:
- Encode/decode JWT using HS256
- Secret from env/constant
- Include exp claim (24 hour expiry)

### `middleware/auth.php`:
- Read `Authorization: Bearer <token>` header
- Decode and verify JWT
- Set `$_REQUEST['auth_user']` with decoded payload
- Return 401 JSON error if invalid/expired

### `api/auth/login.php`:
- POST only
- Validate email + password
- Verify password_hash
- Return JWT + user info (id, name, email, role)

### Product API (`api/products/index.php`):
- GET: return paginated products with JOIN to categories, suppliers, zones. Support query params: `search`, `category_id`, `zone_id`, `supplier_id`, `stock_status` (in/low/out), `sort_by`, `sort_dir`, `page`, `limit`
- POST: create product, validate SKU uniqueness, return created product

### Product API (`api/products/[id].php`):
- Since PHP doesn't support dynamic filenames, use `api/products/single.php?id=X`
- GET: single product with full joins + last 10 stock movements
- PUT: update product fields
- DELETE: soft delete (set is_active=0) or hard delete with transaction

### Stock API (`api/stock/index.php`):
- GET: paginated movements with JOINs to products and users. Support filters: date_from, date_to, type, product_id, user_id, reference
- POST: create movement — use **transaction**: read current stock, validate (OUT cannot exceed stock), insert movement, update product stock_quantity, commit. Return movement + updated product.

### Stock API (`api/stock/adjust.php`):
- POST: set stock to exact quantity — transaction: read current, insert ADJUSTMENT movement with previous/new, update product.

### Orders API:
- `index.php` GET: paginated orders with item count and total. Filters: status, type, date range, search.
- `index.php` POST: transaction — insert order, insert all order_items with calculated totals, return full order.
- `single.php?id=X` GET: order + order_items with product details.
- `single.php?id=X` PUT: update status. If status becomes DELIVERED/CONFIRMED and `auto_stock=true` param: create stock movements for each order item in a transaction.

### Reports API:
All report endpoints: GET only, no pagination, return aggregated data for charts/tables.

---

## REACT FRONTEND REQUIREMENTS

### `src/api/` — Axios instance:
```javascript
// api/axios.js
import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('wms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) { localStorage.removeItem('wms_token'); window.location = '/login'; }
    return Promise.reject(err);
  }
);
export default api;
```

### Routing (`App.jsx`):
```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<Layout />}>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/stock-movements" element={<StockMovements />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/reports" element={<Reports />} />
    </Route>
  </Route>
</Routes>
```

### Design System (Tailwind):
- Color scheme: dark navy sidebar (#0F172A), white main content, accent blue (#3B82F6)
- Font: `Inter` via Google Fonts
- Sidebar: collapsible, shows icons + labels, active state highlighted
- Topbar: page title left, user avatar + name + logout right, notification bell
- Cards: white bg, rounded-xl, shadow-sm, p-6
- Tables: striped rows, hover highlight, sticky header
- Badges: rounded-full, color-coded per type/status
- Modals: centered overlay, max-w-2xl, smooth fade-in animation
- Toast notifications: top-right, auto-dismiss after 4s, success/error/warning variants
- All forms: floating labels or clear labels, red error text below invalid fields
- Loading states: skeleton shimmer on tables and cards, spinner on buttons during submit
- Responsive: sidebar collapses to icon-only on md, drawer on mobile

### State Management:
- Use React Context only for auth (`AuthContext`)
- All other state: local `useState` + `useEffect` per page
- No Redux needed

### Key UX Rules:
- Every data-changing action (create/update/delete/stock movement/order status change) shows a success or error toast
- Every delete action requires a confirmation modal
- All tables show "No records found" empty state with icon when data is empty
- All API errors are caught and displayed — never silent failures
- Forms reset after successful submission
- Modals can be closed with Escape key and clicking outside

---

## ENVIRONMENT VARIABLES

**`frontend/.env`:**
```
VITE_API_URL=http://localhost/warehouse-wms/backend/api
```

**`backend/config/constants.php`:**
```php
define('JWT_SECRET', 'your-super-secret-key-change-in-production');
define('DB_HOST', 'localhost');
define('DB_NAME', 'warehouse_db');
define('DB_USER', 'root');
define('DB_PASS', '');
```

---

## SECURITY REQUIREMENTS
- All PHP endpoints (except login) must verify JWT before processing
- Use PDO prepared statements everywhere — zero raw SQL string concatenation
- Sanitize and validate all inputs server-side (not just client-side)
- Passwords stored with `password_hash($pass, PASSWORD_BCRYPT)`
- CORS restricted to frontend origin only
- HTTP-only flag consideration noted in comments for production

---

## `.htaccess` (backend root):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
Options -Indexes
```

---

## DELIVERABLES CHECKLIST

Cursor must produce ALL of the following:

- [ ] `database/warehouse.sql` — complete schema + seed data
- [ ] All PHP backend files listed in folder structure
- [ ] All React frontend files listed in folder structure
- [ ] `frontend/package.json` with all dependencies
- [ ] `vite.config.js` and `tailwind.config.js`
- [ ] `README.md` with setup instructions (npm install, import SQL, configure .env, php -S or Apache setup)

Every file must be complete — no `// TODO` placeholders, no stub functions. The system must run end-to-end on first setup.

---

## TECH VERSIONS
- React 18.3
- Vite 5.x
- Tailwind CSS 3.x
- React Router 6.x
- Axios 1.x
- Recharts 2.x
- PHP 8.2
- MySQL 8.0
- JWT: implement manually with `base64_encode/decode` + `hash_hmac` (no external PHP library)
