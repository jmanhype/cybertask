# CyberTask Production Deployment Guide

## Overview
This guide covers the complete deployment process for CyberTask to production environments including Vercel (frontend), Railway/Render (backend), and database setup.

## Prerequisites
- GitHub account with push access to the repository
- Vercel account for frontend deployment
- Railway or Render account for backend deployment
- Supabase or Railway PostgreSQL for database

## Environment Variables

### Frontend (Vercel)
```env
VITE_API_URL=https://cybertask-backend.railway.app/api
VITE_WS_URL=wss://cybertask-backend.railway.app
VITE_APP_NAME=CyberTask
VITE_APP_VERSION=1.0.0
```

### Backend (Railway/Render)
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secure-jwt-secret
CORS_ORIGIN=https://cybertask.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Steps

### 1. Database Setup (Supabase)
1. Create new project in Supabase
2. Copy connection string from Settings > Database
3. Run migrations: `npx prisma migrate deploy`
4. Seed database: `npm run prisma:seed`

### 2. Backend Deployment (Railway)
1. Connect GitHub repository
2. Select backend folder as root directory
3. Configure environment variables
4. Deploy and get production URL

### 3. Frontend Deployment (Vercel)
1. Import project from GitHub
2. Set root directory to `frontend`
3. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Set environment variables
5. Deploy

## Post-Deployment Validation

### API Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/login` - Authentication
- `GET /api/tasks` - Task retrieval
- `POST /api/tasks` - Task creation

### Performance Targets
- API response time: < 200ms
- Page load time: < 2s
- Time to interactive: < 3s

### Security Checklist
- [x] HTTPS enabled
- [x] CORS configured
- [x] Rate limiting active
- [x] JWT tokens secure
- [x] Environment variables protected

## Monitoring & Alerts
- Uptime monitoring via Vercel/Railway
- Error tracking with console logs
- Performance metrics via built-in dashboards

## Rollback Plan
1. Revert to previous deployment in platform dashboard
2. Update DNS if needed
3. Notify users of any downtime

## Support & Troubleshooting
- Check deployment logs in platform dashboards
- Verify environment variables
- Test database connectivity
- Monitor performance metrics

## Launch Checklist
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Performance benchmarks meet targets
- [ ] Documentation updated
- [ ] Demo credentials prepared
- [ ] Monitoring configured
- [ ] Launch announcement ready