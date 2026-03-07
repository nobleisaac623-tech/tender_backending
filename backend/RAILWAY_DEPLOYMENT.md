# Railway Deployment Guide

This guide covers deploying the PHP backend to Railway.

## Prerequisites

1. [Railway Account](https://railway.app/)
2. [Railway CLI](https://docs.railway.app/guides/cli) installed
3. Git repository pushed to GitHub/GitLab

## Deployment Steps

### Step 1: Set Up Railway Project

1. Log in to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Empty Project" or deploy from GitHub

### Step 2: Add MySQL Database

1. In your Railway project, click "Add New" → "Database" → "MySQL"
2. Railway will create a MySQL instance and provide connection variables:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_DATABASE`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`

### Step 3: Configure Environment Variables

1. Go to your backend service "Variables" tab
2. Add the following environment variables:

```
DB_HOST=${MYSQL_HOST}
DB_NAME=${MYSQL_DATABASE}
DB_USER=${MYSQL_USER}
DB_PASS=${MYSQL_PASSWORD}
JWT_SECRET=your-32-character-minimum-secret-key
JWT_EXPIRY=28800
APP_ENV=production
FRONTEND_URL=https://your-frontend-app.railway.app
UPLOAD_PATH=/var/www/html/uploads
```

### Step 4: Deploy Backend

**Option A: From GitHub**

1. Connect your GitHub repository in Railway
2. Select the backend directory or configure the root to deploy from
3. Railway will automatically use the `railway.json` and `Dockerfile`

**Option B: Using Railway CLI**

```bash
# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project
railway link

# Deploy
railway up
```

### Step 5: Import Database

1. Get your MySQL connection string from Railway dashboard
2. Use the database connection details to import your schema:

```bash
# Using mysql CLI
mysql -h ${MYSQL_HOST} -u ${MYSQL_USER} -p ${MYSQL_DATABASE} < database.sql
```

Or use a MySQL client like TablePlus or MySQL Workbench.

### Step 6: Configure Custom Domain (Optional)

1. Go to your backend service "Settings" → "Domains"
2. Add your custom domain
3. Update DNS records as instructed by Railway

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | MySQL host | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database username | Yes |
| `DB_PASS` | Database password | Yes |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | Yes |
| `JWT_EXPIRY` | JWT token expiry in seconds | No (default: 28800) |
| `APP_ENV` | Application environment | No (default: production) |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `MAIL_HOST` | SMTP host | No |
| `MAIL_PORT` | SMTP port | No |
| `MAIL_USER` | SMTP username | No |
| `MAIL_PASS` | SMTP password | No |
| `MAIL_FROM` | From email address | No |
| `ADMIN_EMAIL` | Admin email address | No |
| `UPLOAD_PATH` | Path for file uploads | No |

## Troubleshooting

### Container Won't Start

Check the logs:
```bash
railway logs
```

### Database Connection Failed

1. Verify MySQL service is running
2. Check environment variables are correctly set
3. Ensure database is created and accessible

### 500 Internal Server Error

1. Check Apache logs: `railway logs`
2. Verify `.env` file exists and has correct values
3. Check file permissions on uploads directory

### CORS Errors

Make sure `FRONTEND_URL` is set correctly in environment variables.

## Files Modified for Railway

- `backend/Dockerfile` - Added headers module and Apache configuration
- `backend/.htaccess` - Made RewriteBase dynamic
- `backend/api/.htaccess` - Made RewriteBase dynamic
- `backend/railway.json` - Railway deployment configuration
- `backend/.env.railway` - Environment template

## Quick Deploy Command

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Add MySQL
railway add mysql

# Deploy
railway up
```
