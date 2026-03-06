# Production Deployment Guide

This guide covers deploying the Tender Management System to production with the frontend on Vercel and the backend on a PHP hosting provider (cPanel, Hostinger, etc.).

---

## Architecture Overview

```
┌─────────────────────┐      ┌─────────────────────┐
│   Frontend (Vercel) │ ───► │   Backend (PHP)     │
│   yourapp.vercel.app│      │   api.yourapp.com   │
└─────────────────────┘      └─────────────────────┘
         │                              │
         │                              │
      Browser                      MySQL DB
```

---

## PART 1: Backend Deployment (PHP Hosting)

### Step 1.1: Prepare Your Hosting
1. **Purchase PHP hosting** (cPanel, Hostinger, A2 Hosting, etc.)
2. Ensure PHP 8.2+ is available
3. Create a MySQL 8 database
4. Note your database credentials (host, name, user, password)

### Step 1.2: Upload Backend Files
1. Upload the `backend/` folder to your hosting
2. Recommended: place it at `public_html/api/` or just `api/`
3. Note the full path (e.g., `api.yourdomain.com` or `yourdomain.com/api`)

### Step 1.3: Configure Environment
1. Copy `backend/.env.example` to `backend/.env`
2. Edit `.env` with your production values:

```env
DB_HOST=localhost
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=generate_a_32_character_random_string
FRONTEND_URL=https://yourapp.vercel.app
APP_ENV=production
UPLOAD_PATH=backend/uploads
```

3. **Important:** If placing `.env` inside the web root, ensure `.htaccess` blocks it (already configured).

### Step 1.4: Import Database
1. Import `database.sql` into your MySQL database via phpMyAdmin
2. This creates all tables and seed data

### Step 1.5: Test Backend
Visit `https://api.yourdomain.com/api/tenders/public` — you should see JSON response.

---

## PART 2: Frontend Deployment (Vercel)

### Step 2.1: Prepare Your Code
1. **Push your code to GitHub/GitLab/Bitbucket**

### Step 2.2: Create Vercel Project
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New..." → "Project"
3. Import your GitHub repository

### Step 2.3: Configure Environment Variables
In the Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://api.yourdomain.com` (your backend URL) |

### Step 2.4: Deploy
1. Keep default settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. Click "Deploy"

### Step 2.5: Configure Domain (Optional)
1. Go to Vercel project → Settings → Domains
2. Add your custom domain (e.g., `yourapp.com`)
3. Update DNS records as instructed by Vercel

---

## PART 3: CORS & Authentication Setup

### Backend CORS Configuration
In your `backend/.env`:
```env
FRONTEND_URL=https://yourapp.vercel.app
APP_ENV=production
```

The backend already has CORS configured in `backend/config/cors.php` to:
- Allow credentials (`Access-Control-Allow-Credentials: true`)
- Allow only your frontend origin in production

### Frontend API URL
The frontend automatically uses the `VITE_API_BASE_URL` you set in Vercel.

---

## PART 4: Post-Deployment Checklist

### Verify Everything Works

| Test | URL/Action | Expected |
|------|-------------|----------|
| Public tenders | `https://yourapp.vercel.app` | Landing page loads |
| Login | Click Login → enter `admin@example.com` / `password` | Redirects to dashboard |
| Create tender | Admin dashboard → Create Tender | Form works |
| Publish tender | Tender list → Publish | Status changes to Published |

### Change Default Passwords
The seed users have known passwords. After first login, either:
1. Change the admin password immediately, or
2. Delete seed users and create fresh accounts

### Test Email (Optional)
If you configured mail in `.env`:
1. Go to the contact form
2. Submit a message
3. Check admin email inbox

---

## Troubleshooting

### "Authentication required" errors
- Check `FRONTEND_URL` in backend `.env` matches your Vercel URL exactly
- Ensure no trailing slashes

### "Database connection failed"
- Verify database credentials in `.env`
- Check database user has access to the database

### "CORS error" in browser console
- Clear browser cache/cookies
- Check browser DevTools → Network → Preflight request response headers

### Images not loading
- Category images use Unsplash URLs (requires internet)
- If using offline mode, add local images to `public/images/`

---

## Security Checklist

- [ ] JWT_SECRET is unique (not the example value)
- [ ] FRONTEND_URL exactly matches your Vercel domain
- [ ] APP_ENV=production is set
- [ ] Database password is strong
- [ ] HTTPS enforced on backend domain
- [ ] Default seed passwords changed

---

## Maintenance

### Backup Schedule
- Database: Daily via phpMyAdmin or cron
- Uploads folder: Weekly

### Updates
1. Pull latest code locally
2. Test on local/development
3. Push to Git
4. Vercel auto-deploys on push

---

**Your system is ready for production! 🎉**
