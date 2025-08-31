# Railway Deployment Guide for CyberTask Backend

## Step 1: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select the `jmanhype/cybertask` repository

## Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Wait for the database to provision

## Step 3: Configure Environment Variables

Click on your backend service and go to "Variables" tab. Add these:

```env
# Database (Railway provides DATABASE_URL automatically)
NODE_ENV=production
PORT=3000

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-very-long-random-secret-key-here-minimum-32-characters
JWT_REFRESH_SECRET=another-very-long-random-secret-key-here-minimum-32-characters

# CORS (your Vercel frontend URL)
CORS_ORIGIN=https://frontend-2livxtzlf-straughterguthrie-gmailcoms-projects.vercel.app

# Optional: Email service (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Step 4: Deploy Settings

1. Go to "Settings" tab
2. Under "Build Command", set: `cd backend && npm install && npx prisma generate`
3. Under "Start Command", set: `cd backend && npx prisma migrate deploy && npm run start`
4. Under "Root Directory", leave empty (we handle paths in commands)

## Step 5: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Get your production URL from Railway (e.g., `https://cybertask-backend.railway.app`)

## Step 6: Update Vercel Frontend

Once you have your Railway backend URL, update Vercel:

```bash
# Set production environment variables
vercel env add VITE_API_URL production
# Enter: https://your-railway-app.railway.app/api

vercel env add VITE_WS_URL production
# Enter: wss://your-railway-app.railway.app

# Redeploy with new variables
vercel --prod
```

## Step 7: Create Production User

After deployment, you can create a production user:

1. Use the Railway logs to see if migrations ran successfully
2. You can connect to the Railway PostgreSQL using the connection string from Railway dashboard
3. Or use the API to create the first user

## Alternative: Use Docker Image

Instead of deploying from GitHub, you can use our pre-built Docker image:

1. In Railway, click "+ New" → "Empty Service"
2. Go to Settings → Source → Docker Image
3. Enter: `ghcr.io/jmanhype/cybertask-backend:latest`
4. Add the same environment variables as above
5. Deploy!

## Useful Railway CLI Commands (after login)

```bash
# Link to project
railway link

# View logs
railway logs

# Run migrations manually
railway run npx prisma migrate deploy

# Open Railway dashboard
railway open
```

## Troubleshooting

- If migrations fail, check DATABASE_URL is set correctly
- If CORS errors, ensure CORS_ORIGIN matches your Vercel URL exactly
- Check Railway logs for any startup errors
- Ensure all environment variables are set