# Task: Fix Railway Backend 404 → 500 Errors (API Endpoints)

## Plan Breakdown & Progress

### 1. ✅ Switch to Apache Dockerfile (from CLI)
   - Created `backend/Dockerfile.apache`: php:8.2-apache + mod_rewrite + uploads perms.
   - **User**: Railway → service Settings → Build → Dockerfile path = `Dockerfile.apache`
   - Uses `.htaccess` routing: `/api/categories` → `api/categories/index.php`
   - Frontend: `VITE_API_URL=https://tenderbackending-production.up.railway.app/api`

### 2. ✅ DB Var Priority Fix
   - **DONE**: `database.php`: `DB_*` > `MYSQL*` priority (matches RAILWAY_DEPLOYMENT.md).
   - Vars: `DB_HOST=${MYSQL_HOST}`, `DB_PORT=${MYSQL_PORT}`, etc.

### 3. User Actions After Edits
   - Redeploy backend to Railway.
   - Check Railway service logs (Variables tab → Logs) for error details (DB connect? PDO? missing tables?).
   - Add MySQL service to Railway project, copy vars (MYSQLHOST, MYSQLPORT, MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD).
   - Test: `curl https://tenderbackending-production.up.railway.app/api/categories`.

### 4. Fix Based on Logs
   - DB vars missing → Set Railway vars.
   - Tables missing → Run migrations/seeds.
   - Auth issues → Skip for public endpoints.

### 5. Verify & Complete
   - All endpoints 200.
   - Frontend works.

### Next User Steps:
1. **Railway backend service** → Settings → Build → Dockerfile path = `Dockerfile.apache`
2. **Add MySQL**: New → Database → MySQL → Variables → copy to app: `DB_HOST=${MYSQL_HOST}` etc.
3. **Deploy** → test `curl https://.../api/categories`
4. **Frontend Vercel** → Env: `VITE_API_URL=https://tenderbackending-production.up.railway.app/api` → Redeploy.
5. Share logs/JSON.

