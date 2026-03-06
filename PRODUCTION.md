# Production Readiness Checklist

Use this checklist before going live. The system is **feature-complete** and **secure by design** (prepared statements, JWT, validation, audit log); the items below ensure deployment and configuration are correct.

---

## Backend (cPanel / PHP hosting)

- [ ] **PHP 8.2** selected in cPanel.
- [ ] **.env** created from `backend/.env.example` and placed **outside** `public_html` if possible (e.g. one level above the API folder). If .env is inside the API folder, ensure `.htaccess` blocks `\.env` (already configured).
- [ ] **JWT_SECRET** is at least 32 characters and unique; never use the example value.
- [ ] **Database**: MySQL 8 database created; `database.sql` imported. DB user has full access to that database only.
- [ ] **FRONTEND_URL** set to the exact frontend URL (e.g. `https://yourapp.vercel.app`). No trailing slash.
- [ ] **APP_ENV=production** set so CORS allows only the frontend origin.
- [ ] **Mail**: `MAIL_HOST`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` (and optionally `ADMIN_EMAIL`) configured so contact form and notifications send email. Test with a password reset or contact submit.
- [ ] **UPLOAD_PATH** points to a directory outside the web root (or a non-served path). Directory exists and is writable (e.g. `755` or `775`). `.htaccess` blocks direct access to `uploads/` if it is under web root.
- [ ] **mod_rewrite** enabled. URL routing: `/api/auth/login` → `api/auth/login.php`. `RewriteBase` in `.htaccess` matches your path (e.g. `/api/` when backend is at `domain.com/api/`).
- [ ] **HTTPS** enforced on the API domain (cPanel or Cloudflare). Required for httpOnly cookies in production.

---

## Frontend (Vercel)

- [ ] **VITE_API_BASE_URL** set in Vercel environment variables to the full API base URL (e.g. `https://api.yourcompany.com`). No trailing slash. Build command: `npm run build`; output: `dist`.
- [ ] **Cookies**: Frontend and API must share a compatible origin or cookie domain/SameSite for JWT cookies. With Vercel (yourapp.vercel.app) and API on api.yourcompany.com, ensure CORS uses `Access-Control-Allow-Credentials: true` (already set) and `FRONTEND_URL` matches the Vercel URL exactly.

---

## Security (already implemented)

- Prepared statements for all DB queries (no raw SQL concatenation).
- Passwords hashed with `PASSWORD_BCRYPT`.
- JWT in httpOnly cookie; optional Authorization header; token blacklist on logout.
- Login rate limit: 5 attempts per minute per IP.
- File uploads: MIME type + extension whitelist; max 10MB; files stored with UUID-style names.
- Download endpoint: permission checks by role (admin/evaluator/supplier) and resource ownership/assignment.
- CORS: in production, only `FRONTEND_URL` origin allowed.
- `.htaccess` blocks `.env`, `.ini`, `.log`, `.sql` and directory listing.

---

## Recommended before launch

1. **Change seed passwords**: Default seed users use a known password; change all passwords after first login or replace seed data.
2. **Test flows**: Register → approve supplier → publish tender → submit bid → evaluate → finalize → report.
3. **Test contact form**: Submit and confirm admin receives the email.
4. **Backups**: Schedule DB and `UPLOAD_PATH` backups (cPanel or external).

---

## Not required but optional

- **Contact form rate limit**: Add per-IP rate limiting (e.g. 10 submissions per hour) to reduce abuse; login already has rate limiting.
- **Refresh token**: Current design uses short-lived JWT (e.g. 8h) and a refresh endpoint; no separate 7-day refresh token table. Acceptable for single-tenant.
- **403 page**: When a user hits a route they’re not allowed to (e.g. supplier on `/admin/dashboard`), they’re redirected to `/`. You can add a “Forbidden” message or redirect to role-specific dashboard.

---

**Summary:** The system is **production-ready** once the checklist above is completed: correct .env, DB, mail, upload path, CORS/FRONTEND_URL, HTTPS, and frontend API URL. Core security (auth, SQL, uploads, CORS) is in place.
