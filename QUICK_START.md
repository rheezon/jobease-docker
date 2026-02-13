# JobKick - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Docker & Docker Compose installed
- API keys ready (see below)

---

## Step 1: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required API Keys:**
1. **Gemini AI**: https://makersuite.google.com/app/apikey
2. **Cloudinary**: https://cloudinary.com (free signup)
3. **Google OAuth**: https://console.cloud.google.com
4. **Telegram API**: https://my.telegram.org/apps
5. **Gmail SMTP**: Generate app password at https://myaccount.google.com/apppasswords

---

## Step 2: Start Everything

```bash
# Make script executable
chmod +x jobease.sh

# Start all services
./jobease.sh start
```

**This will:**
- ✅ Build all Docker images
- ✅ Start MySQL database
- ✅ Start backend API (Spring Boot)
- ✅ Start frontend (React + Nginx)
- ✅ Start jobs fetcher (Python)
- ✅ Initialize database with schema
- ✅ Run health checks

**Wait 2-3 minutes for services to initialize.**

---

## Step 3: Verify & Access

```bash
# Check status
./jobease.sh status

# Should show all services as "Up"
```

**Access the application:**
- 🌐 **Frontend**: http://localhost:5173
- 🔌 **Backend API**: http://localhost:8080/api
- 🗄️ **MySQL**: localhost:3307

---

## Common Commands

```bash
./jobease.sh start       # Start all services
./jobease.sh stop        # Stop all services
./jobease.sh restart     # Restart all services
./jobease.sh logs        # View all logs
./jobease.sh logs backend # View specific service logs
./jobease.sh status      # Check service status
./jobease.sh health      # Run health checks
./jobease.sh rebuild     # Rebuild after code changes
./jobease.sh backup      # Backup database
./jobease.sh clean       # Remove everything
```

---

## Troubleshooting

### Services won't start?
```bash
# Check logs for errors
./jobease.sh logs

# Try clean restart
./jobease.sh stop
./jobease.sh clean
./jobease.sh start
```

### Database connection errors?
```bash
# Verify MySQL is running
docker-compose ps mysql

# Check database credentials in .env file
```

### Frontend can't reach backend?
```bash
# Check backend is accessible
curl http://localhost:8080/api/auth/test

# Verify VITE_API_BASE_URL in .env
```

### Can't access on port 3000?
```bash
# Check if port is already in use
netstat -an | grep 3000

# Change port in docker-compose.yml if needed
```

---

## First Time Setup

1. **Open frontend**: http://localhost:5173
2. **Sign up** for a new account
3. **Complete onboarding** with your preferences
4. **Create a notifier** with your job criteria
5. **Upload your resume** in LaTeX format
6. **Wait for jobs** to be fetched and matched

---

## Architecture at a Glance

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Frontend │ ───▶ │ Backend  │ ◀─── │  Jobs    │
│ (React)  │      │ (Spring) │      │ Fetcher  │
│ :3000    │      │ :8080    │      │ (Python) │
└──────────┘      └────┬─────┘      └────┬─────┘
                       │                  │
                  ┌────▼──────────────────▼────┐
                  │      MySQL Database        │
                  │         :3306              │
                  └────────────────────────────┘
```

---

## What Happens After Start?

1. **Jobs Fetcher** connects to Telegram and fetches job postings
2. Jobs are stored in MySQL `jobs` table
3. **Backend Scheduler** runs every minute:
   - Fetches unprocessed jobs
   - Matches against your notifiers using AI
   - Generates customized resumes
   - Creates notifications
4. **Frontend** displays your relevant job matches
5. You can view details, download resumes, and mark as applied

---

## Next Steps

- 📖 Read full documentation: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- 🔧 Customize configuration: Edit `.env` file
- 📊 Monitor performance: `./jobease.sh stats`
- 💾 Setup backups: Add to crontab
- 🚀 Deploy to production: See production guide

---

## Need Help?

- Check logs: `./jobease.sh logs`
- Run health check: `./jobease.sh health`
- Read full docs: `DOCKER_DEPLOYMENT.md`
- Check troubleshooting section in main docs

---

**That's it! You're ready to go! 🎉**

