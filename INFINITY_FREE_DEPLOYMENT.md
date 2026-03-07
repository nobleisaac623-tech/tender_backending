# Deployment Options for Supply Tender Backend

You have two options to deploy your backend:

## Option 1: Traditional Upload (No Docker)

Follow these steps to upload PHP files directly to Infinity Free.

### Step 1: Create MySQL Database on Infinity Free

1. Log in to your Infinity Free control panel (ifz.cc)
2. Go to **MySQL Databases** section
3. Create a new database:
   - Database Name: (e.g., `sql_xxxxxx_supplier_eval`)
   - Username: (e.g., `sql_xxxxxx_admin`)
   - Password: Create a strong password
4. **Note down** the database credentials - you'll need them later

The DB Host is typically shown in the MySQL Databases section - it looks like: `sql313.infinityfree.com`

### Step 2: Upload Backend Files

1. In Infinity Free control panel, go to **File Manager**
2. Navigate to `htdocs` folder
3. Create a new folder named `backend` (or upload directly to htdocs)
4. Upload all files from your `backend/` folder:
   - All PHP files in `api/`, `config/`, `helpers/`
   - The `.htaccess` file
   - **Do NOT upload `.env` file** - you'll create it on the server

### Step 3: Create .env Configuration

In the `backend` folder on Infinity Free, create a new file named `.env` with these contents:

```env
DB_HOST=sql313.infinityfree.com  # Check your MySQL hostname in control panel
DB_NAME=sql_xxxxxx_supplier_eval  # Your database name
DB_USER=sql_xxxxxx_admin  # Your database username
DB_PASS=your_database_password  # Your database password
JWT_SECRET=your-super-secret-key-here-min-32-chars
JWT_EXPIRY=28800
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_mailtrap_user
MAIL_PASS=your_mailtrap_pass
MAIL_FROM=noreply@yourcompany.com
ADMIN_EMAIL=admin@yourcompany.com
UPLOAD_PATH=/var/uploads/supplier-eval
APP_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

**Important:** Replace the values with your actual Infinity Free credentials.

### Step 4: Import Database Schema

1. In Infinity Free control panel, go to **phpMyAdmin**
2. Select your database
3. Click **Import** tab
4. Upload the `database.sql` file from your project
5. Also import these migration files if needed:
   - `database_migration_categories_tags.sql`
   - `database_migration_contact_messages.sql`
   - `database_migration_contracts.sql`
   - `database_migration_supplier_ratings.sql`

### Step 5: Test Your Backend

After deployment, test your API:
```
https://yourdomain.infinityfree.net/backend/api/auth/login.php
```

You should get a JSON response (may show error if no POST data, but that's OK - it means PHP is working).

### Step 6: Update Frontend Configuration

For Vercel to connect to your Infinity Free backend, set the environment variable:

1. In Vercel dashboard, go to your project **Settings** → **Environment Variables**
2. Add:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://yourdomain.infinityfree.net/backend/api`
3. Redeploy your frontend

---

## Option 2: Docker Deployment (Recommended for Self-Hosted Servers)

I've created Docker files for easier deployment. Use this option if you have a server with Docker installed (not Infinity Free directly, but for other hosting providers like DigitalOcean, AWS, etc.)

### Quick Start with Docker

1. **Configure environment**:
   ```bash
   cp .env.docker .env
   # Edit .env with your actual values
   ```

2. **Build and start**:
   ```bash
   # Using Make (recommended)
   make build
   make up

   # Or using docker-compose directly
   docker-compose up -d
   ```

3. **Access the application**:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8080/api

### Docker Files Created

| File | Description |
|------|-------------|
| `backend/Dockerfile` | PHP 8.2 Apache image for backend |
| `frontend/Dockerfile` | Node.js build + Nginx for frontend |
| `frontend/nginx.conf` | Nginx configuration with API proxy |
| `docker-compose.yml` | Development compose file |
| `docker-compose.prod.yml` | Production-optimized compose |
| `Makefile` | Handy management commands |
| `.env.docker` | Template environment variables |

### Docker Management Commands

```bash
make build     # Build all Docker images
make up        # Start all services
make down      # Stop all services
make restart   # Restart all services
make logs      # View logs (all services)
make ps        # List running containers
make clean     # Remove all containers and volumes
```

### Deploying with Docker to a VPS

1. Copy files to your server:
   ```bash
   scp -r . user@your-server:/opt/supply-tender/
   ```

2. SSH into server and configure:
   ```bash
   cd /opt/supply-tender
   cp .env.docker .env
   nano .env  # Update with your production values
   ```

3. Start services:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. Set up reverse proxy (nginx) for SSL/HTTPS

---

## Troubleshooting

- **500 Error (Traditional)**: Check `.env` file exists and has correct database credentials
- **404 Error (Traditional)**: Ensure `.htaccess` is uploaded and mod_rewrite is enabled
- **Database Connection Error**: Verify MySQL hostname (usually `sqlXXX.infinityfree.com`)
- **Docker Issues**: Check logs with `make logs` or `docker-compose logs`
