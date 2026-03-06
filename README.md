# Supplier Evaluation & Tender Management System

Production-ready single-tenant system for publishing tenders, receiving supplier bids, evaluating and scoring bids, and generating reports.

## Stack

- **Frontend:** React (Vite + TypeScript), Tailwind CSS, shadcn/ui, React Query, React Hook Form + Zod
- **Backend:** Plain PHP 8.2 REST API (no framework)
- **Database:** MySQL 8
- **Auth:** JWT in httpOnly cookies
- **Hosting:** cPanel (backend) + Vercel (frontend)

## Local setup (XAMPP + Node)

### 1. Database (MySQL)

1. Start **MySQL** from XAMPP Control Panel.
2. Create a database (e.g. `supplier_eval`) in phpMyAdmin, or:  
   `mysql -u root -p -e "CREATE DATABASE supplier_eval;"`
3. Import: `mysql -u root -p supplier_eval < database.sql` (or use phpMyAdmin → Import → `database.sql`).
4. Seed users use password: **password**.

### 2. Backend (PHP)

1. Copy env: `copy backend\.env.example backend\.env`
2. Edit `backend\.env` for local:
   - **DB_HOST**=localhost, **DB_NAME**=supplier_eval, **DB_USER**=root, **DB_PASS**=your MySQL password (or leave empty)
   - **JWT_SECRET**=any string at least 32 characters
   - **FRONTEND_URL**=http://localhost:5173
   - **APP_ENV**=development
   - **UPLOAD_PATH**=c:\xampp\htdocs\suppy_tender\backend\uploads (or `backend/uploads` relative)
3. Start **Apache** in XAMPP. API URL: **http://localhost/suppy_tender/backend/api**  
   Test: open `http://localhost/suppy_tender/backend/api/tenders/public` in browser → should see JSON.

### 3. Frontend (Vite)

1. Copy env: `copy frontend\.env.example frontend\.env`
2. Set in `frontend\.env`: **VITE_API_BASE_URL**=http://localhost/suppy_tender/backend/api (no trailing slash)
3. Run:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Open **http://localhost:5173** → Login with admin@example.com / password

If tenders or login fail: check Apache + MySQL are running, backend `.env` has correct DB and FRONTEND_URL, and frontend `.env` matches the API URL above.

---

## Quick start (reference)

### Database

1. Create a MySQL database and user.
2. Import: `mysql -u root -p your_db < database.sql`
3. Seed users have password: **password**. Change in production.

### Backend (PHP)

1. Copy `backend/.env.example` to `backend/.env`; set DB_*, JWT_SECRET (32+ chars), FRONTEND_URL (e.g. http://localhost:5173 for local).
2. For local: use APP_ENV=development and UPLOAD_PATH to a writable folder.

### Frontend

1. Copy `frontend/.env.example` to `frontend/.env`; set VITE_API_BASE_URL to your backend (e.g. http://localhost/suppy_tender/backend/api).
2. `cd frontend && npm install && npm run dev`

## Deployment

- **Backend:** Upload the `backend` folder to cPanel so the API is available at your chosen URL. Set `.env` (or env vars in cPanel). Enable `mod_rewrite` for `.htaccess`. PHP 8.2.
- **Frontend:** Connect the repo to Vercel, set `VITE_API_BASE_URL`, build with `npm run build`, output `dist`.

## Default seed users (development)

| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Admin    | admin@example.com   | password  |
| Evaluator| evaluator@example.com | password |
| Supplier | supplier@example.com | password |

Change all passwords after first login in production.
