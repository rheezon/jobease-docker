# JobEase - Complete Docker Deployment Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Configuration](#configuration)
6. [Management Commands](#management-commands)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)
9. [Backup & Recovery](#backup--recovery)

---

## 🏗️ System Overview

JobEase is a comprehensive job notification system consisting of four interconnected services:

### **Services Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        JobEase Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Frontend   │  │   Backend    │  │ Jobs Fetcher │         │
│  │   (React)    │◄─┤ (Spring Boot)│◄─┤   (Python)   │         │
│  │   Port 3000  │  │  Port 8080   │  │   Telethon   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
│                           │                                     │
│                  ┌────────▼────────┐                            │
│                  │     MySQL       │                            │
│                  │   Database      │                            │
│                  │   Port 3306     │                            │
│                  └─────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **Component Details**

#### 1️⃣ **MySQL Database** (`mysql`)
- **Purpose**: Central database for all services
- **Port**: 3306 (internal), 3307 (external)
- **Data**: Users, notifiers, jobs, notifications, scheduler state
- **Persistence**: Volume-mounted for data persistence
- **Health Check**: Automated readiness check

#### 2️⃣ **Backend API** (`job-notifier`)
- **Technology**: Spring Boot 3.5.6 (Java 17)
- **Port**: 8080
- **Features**:
  - JWT-based authentication
  - RESTful API endpoints
  - AI-powered job matching (Google Gemini)
  - LaTeX resume compilation
  - Cloudinary storage integration
  - Scheduled job processing
  - Email notifications
- **Dependencies**: MySQL, External APIs (Gemini, Cloudinary)

#### 3️⃣ **Jobs Fetcher** (`jobs-fetcher`)
- **Technology**: Python 3.11 (Telethon)
- **Purpose**: Fetch jobs from Telegram channels
- **Function**: Inserts job postings into MySQL database
- **Schedule**: Continuous monitoring with scheduler
- **Dependencies**: MySQL, Telegram API

#### 4️⃣ **Frontend Web App** (`frontend`)
- **Technology**: React 19 + Vite
- **Server**: Nginx
- **Port**: 3000
- **Features**:
  - User authentication & registration
  - Notifier management dashboard
  - Job notifications viewer
  - Profile & settings management
  - Responsive design
- **API Integration**: Communicates with backend API

---

## 🎯 Architecture

### **Network Architecture**
```
┌──────────────────────────────────────────────────────────┐
│                   jobease-network (Bridge)               │
│                                                          │
│  frontend:80 ──→ nginx ──→ React App (Port 3000)       │
│       ↓                                                  │
│  backend:8080 ──→ Spring Boot API                       │
│       ↓              ↓                                   │
│  jobs-fetcher ──→ Python Script                         │
│       ↓              ↓                                   │
│  mysql:3306 ──→ MySQL Database                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### **Data Flow**

```
Telegram → Jobs Fetcher → MySQL → Backend Scheduler
                           ↓
                    Backend API ← Frontend
                           ↓
                    User Notifications
```

### **Volumes**
- `mysql_data`: Persistent MySQL database storage
- `app_logs`: Backend application logs
- `nginx_logs`: Frontend access logs

---

## ✅ Prerequisites

### **Software Requirements**
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB free disk space

### **API Keys & Credentials**
You'll need the following before deployment:

1. **Google Gemini API Key** (for AI job matching)
   - Get it from: https://makersuite.google.com/app/apikey

2. **Cloudinary Account** (for resume storage)
   - Sign up at: https://cloudinary.com
   - Required: Cloud Name, API Key, API Secret

3. **Google OAuth Client ID** (for Google login)
   - Create at: https://console.cloud.google.com

4. **Gmail SMTP Credentials** (for email notifications)
   - Enable 2FA on Gmail
   - Generate App Password: https://myaccount.google.com/apppasswords

5. **Telegram API Credentials** (for jobs fetcher)
   - Get from: https://my.telegram.org/apps
   - Required: API ID, API Hash

---

## 🚀 Quick Start

### **Step 1: Clone & Navigate**
```bash
cd /Users/visheshgarg/vishesh/personal/jobease
```

### **Step 2: Configure Environment**
```bash
# Copy the environment template
cp .env.example .env

# Edit with your credentials
nano .env  # or use your preferred editor
```

### **Step 3: Build & Start All Services**
```bash
# Make the management script executable
chmod +x jobease.sh

# Start everything
./jobease.sh start
```

### **Step 4: Verify Deployment**
```bash
# Check all services are running
./jobease.sh status

# View logs
./jobease.sh logs
```

### **Step 5: Access the Application**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api
- **MySQL**: localhost:3307

---

## ⚙️ Configuration

### **Environment Variables (.env file)**

Create a `.env` file in the root directory with the following:

```env
#####################################################
# JOBEASE - ENVIRONMENT CONFIGURATION
#####################################################

# ==================================================
# DATABASE CONFIGURATION
# ==================================================
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=job_notifier_db
MYSQL_USER=jobnotifier
MYSQL_PASSWORD=jobnotifier_secure_password

# ==================================================
# BACKEND CONFIGURATION
# ==================================================

# JWT Authentication
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_64_characters_long_random_string
JWT_EXPIRATION=86400000

# AI Configuration (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
AI_RELEVANCE_THRESHOLD=0.7

# Google OAuth
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration (Gmail SMTP)
SPRING_MAIL_USERNAME=your_email@gmail.com
SPRING_MAIL_PASSWORD=your_gmail_app_password

# LaTeX Compiler
LATEX_COMPILER_URL=https://latex.ytotech.com/builds/sync
LATEX_TIMEOUT=30000

# Scheduler Configuration
SCHEDULER_FIXED_RATE=60000
SCHEDULER_ENABLED=true
SCHEDULER_DEADLINE_REMINDER_ENABLED=true
NOTIFICATION_CLEANUP_ENABLED=true

# Notifier Limits
NOTIFIER_MAX_PER_USER=5

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# ==================================================
# FRONTEND CONFIGURATION
# ==================================================
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_ENABLE_BACKEND_API=true

# ==================================================
# JOBS FETCHER CONFIGURATION (Python/Telethon)
# ==================================================
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_PHONE=your_phone_number_with_country_code
TELEGRAM_CHANNELS=@jobchannel1,@jobchannel2

# Database connection for jobs fetcher
DB_HOST=mysql
DB_PORT=3306
DB_NAME=job_notifier_db
DB_USER=jobnotifier
DB_PASSWORD=jobnotifier_secure_password
```

### **Configuration Notes**

1. **Security First**: 
   - Change ALL default passwords
   - Use strong random strings for JWT_SECRET (64+ characters)
   - Never commit `.env` to version control

2. **URLs & Ports**:
   - Use `localhost` for local development
   - Use domain names for production
   - Backend API URL in frontend config must be accessible

3. **API Keys**:
   - Gemini API has free tier limits
   - Cloudinary free tier: 25GB storage
   - Keep API keys confidential

---

## 🎮 Management Commands

### **Using the Management Script**

The `jobease.sh` script provides convenient commands to manage the entire stack:

```bash
# Start all services
./jobease.sh start

# Stop all services
./jobease.sh stop

# Restart all services
./jobease.sh restart

# View status of all services
./jobease.sh status

# View logs (all services)
./jobease.sh logs

# View logs (specific service)
./jobease.sh logs backend
./jobease.sh logs frontend
./jobease.sh logs mysql
./jobease.sh logs jobs-fetcher

# Rebuild and restart (after code changes)
./jobease.sh rebuild

# Clean everything (removes containers, volumes, images)
./jobease.sh clean

# Database backup
./jobease.sh backup

# Database restore
./jobease.sh restore backup_file.sql

# Health check
./jobease.sh health

# View resource usage
./jobease.sh stats
```

### **Manual Docker Compose Commands**

If you prefer using docker-compose directly:

```bash
# Start services in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Scale services (if needed)
docker-compose up -d --scale backend=3

# Execute commands in container
docker-compose exec backend bash
docker-compose exec mysql mysql -u root -p
```

---

## 🔍 Troubleshooting

### **Common Issues & Solutions**

#### **1. Services Won't Start**

**Symptom**: Containers fail to start or immediately exit

**Solutions**:
```bash
# Check logs for specific service
./jobease.sh logs backend

# Verify environment variables
docker-compose config

# Check if ports are already in use
netstat -an | grep 3000
netstat -an | grep 8080
netstat -an | grep 3307

# Remove and restart
./jobease.sh stop
./jobease.sh start
```

#### **2. Database Connection Errors**

**Symptom**: Backend can't connect to MySQL

**Solutions**:
```bash
# Check if MySQL is healthy
docker-compose ps

# Verify MySQL is accepting connections
docker-compose exec mysql mysql -u jobnotifier -p job_notifier_db

# Check environment variables
docker-compose exec backend env | grep SPRING_DATASOURCE

# Restart with fresh database
docker-compose down -v
docker-compose up -d
```

#### **3. Frontend Can't Reach Backend**

**Symptom**: API calls fail with connection errors

**Solutions**:
```bash
# Check backend is running
curl http://localhost:8080/api/auth/test

# Verify VITE_API_BASE_URL in frontend
docker-compose exec frontend cat /usr/share/nginx/html/index.html | grep VITE_

# Check CORS configuration in backend
# Ensure frontend URL is allowed in SecurityConfig.java

# Rebuild frontend with correct env vars
./jobease.sh rebuild
```

#### **4. Jobs Not Being Fetched**

**Symptom**: No jobs appearing in database

**Solutions**:
```bash
# Check jobs-fetcher logs
./jobease.sh logs jobs-fetcher

# Verify Telegram credentials
docker-compose exec jobs-fetcher env | grep TELEGRAM

# Check if jobs table exists
docker-compose exec mysql mysql -u jobnotifier -p -e "USE job_notifier_db; SELECT COUNT(*) FROM jobs;"

# Restart jobs-fetcher
docker-compose restart jobs-fetcher
```

#### **5. High Memory/CPU Usage**

**Symptom**: System becomes slow or unresponsive

**Solutions**:
```bash
# Check resource usage
./jobease.sh stats

# Limit resources in docker-compose.yml
# Add under each service:
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G

# Stop unused services temporarily
docker-compose stop jobs-fetcher

# Clean up unused resources
docker system prune -a
```

#### **6. SSL/HTTPS Issues in Production**

**Symptom**: Mixed content errors, SSL warnings

**Solutions**:
- Use a reverse proxy (Nginx/Caddy) with Let's Encrypt
- Update all URLs to use HTTPS
- Configure proper CORS headers
- See [Production Deployment](#production-deployment) section

### **Debugging Tips**

```bash
# Get shell access to any container
docker-compose exec backend bash
docker-compose exec mysql bash

# Check container resource usage
docker stats

# Inspect container details
docker inspect jobease-backend

# View container processes
docker-compose top

# Check network connectivity
docker-compose exec backend ping mysql
docker-compose exec frontend ping backend
```

---

## 🚀 Production Deployment

### **Recommended Changes for Production**

#### **1. Use Production Docker Compose**

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mysql:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

  backend:
    restart: always
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - LOGGING_LEVEL_ROOT=WARN
      - LOGGING_LEVEL_COM_JOBNOTIFER=INFO
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

  frontend:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

  jobs-fetcher:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

#### **2. Add Reverse Proxy (Nginx/Caddy)**

Example Caddy configuration:

```caddyfile
jobease.yourdomain.com {
    reverse_proxy frontend:80
}

api.jobease.yourdomain.com {
    reverse_proxy backend:8080
}
```

#### **3. Security Hardening**

```bash
# Use Docker secrets instead of environment variables
docker secret create mysql_root_password ./mysql_root_pwd.txt
docker secret create jwt_secret ./jwt_secret.txt

# Enable Docker content trust
export DOCKER_CONTENT_TRUST=1

# Scan images for vulnerabilities
docker scan jobease-backend:latest
```

#### **4. Monitoring & Logging**

Add monitoring services to `docker-compose.yml`:

```yaml
# Prometheus for metrics
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

# Grafana for visualization
grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"

# Loki for log aggregation
loki:
  image: grafana/loki
```

#### **5. Automated Backups**

Create a cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/jobease/jobease.sh backup
```

#### **6. CI/CD Integration**

Example GitHub Actions workflow:

```yaml
name: Deploy JobEase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push images
        run: |
          docker-compose build
          docker-compose push
      
      - name: Deploy to server
        run: |
          ssh user@server 'cd /app/jobease && ./jobease.sh restart'
```

---

## 💾 Backup & Recovery

### **Database Backup**

#### **Automated Backup**
```bash
# Using management script
./jobease.sh backup

# Manual backup
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} job_notifier_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### **Scheduled Backups**
```bash
# Create backup script
cat > backup-cron.sh << 'EOF'
#!/bin/bash
cd /path/to/jobease
./jobease.sh backup
# Keep only last 30 days
find ./backups -name "*.sql" -mtime +30 -delete
EOF

chmod +x backup-cron.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /path/to/jobease/backup-cron.sh" | crontab -
```

### **Database Restore**

```bash
# Using management script
./jobease.sh restore backup_file.sql

# Manual restore
cat backup_file.sql | docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} job_notifier_db
```

### **Full System Backup**

```bash
# Backup everything
tar -czf jobease_full_backup_$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  jobease.sh \
  /var/lib/docker/volumes/jobease_mysql_data \
  /var/lib/docker/volumes/jobease_app_logs
```

### **Disaster Recovery Plan**

1. **Keep backups in multiple locations**
   - Local disk
   - Cloud storage (S3, Google Drive)
   - External server

2. **Test restore procedure regularly**
   ```bash
   # Test on staging environment
   ./jobease.sh restore latest_backup.sql
   ./jobease.sh health
   ```

3. **Document configuration**
   - Keep copy of `.env` securely
   - Document any custom changes
   - Maintain API credentials list

---

## 📊 Monitoring & Maintenance

### **Health Checks**

```bash
# Quick health check
./jobease.sh health

# Detailed status
./jobease.sh status

# Check logs for errors
./jobease.sh logs | grep -i error

# Monitor resource usage
./jobease.sh stats
```

### **Regular Maintenance Tasks**

```bash
# Weekly: Clean up old logs (>30 days)
find ./logs -name "*.log" -mtime +30 -delete

# Weekly: Check disk space
df -h

# Monthly: Update images
docker-compose pull
./jobease.sh restart

# Monthly: Clean unused resources
docker system prune -a --volumes

# Quarterly: Review and optimize database
docker-compose exec mysql mysqlcheck -u root -p --optimize --all-databases
```

### **Performance Tuning**

```bash
# MySQL optimization
docker-compose exec mysql mysql -u root -p -e "
  SET GLOBAL innodb_buffer_pool_size = 2G;
  SET GLOBAL max_connections = 200;
"

# Backend JVM tuning (in docker-compose.yml)
environment:
  - JAVA_OPTS=-Xmx2g -Xms1g -XX:+UseG1GC
```

---

## 📝 Additional Resources

### **Useful Links**
- Backend API Documentation: http://localhost:8080/swagger-ui.html (if enabled)
- Spring Boot Docs: https://spring.io/projects/spring-boot
- React Docs: https://react.dev
- Docker Docs: https://docs.docker.com

### **Support**
- GitHub Issues: [Your Repository URL]
- Email: [Your Support Email]
- Documentation: [Your Docs URL]

---

## 🎓 Understanding the System

### **How It Works**

1. **Jobs Fetcher** monitors Telegram channels for job postings
2. Jobs are stored in **MySQL** database
3. **Backend Scheduler** (runs every minute):
   - Fetches new unprocessed jobs
   - Matches against active notifiers
   - Uses **Gemini AI** to score relevance
   - Generates customized resumes
   - Stores resumes in **Cloudinary**
   - Creates notifications for users
4. **Frontend** displays notifications to users
5. Users can view, manage, and track job applications

### **Tech Stack**
- **Frontend**: React 19, Vite, Axios, React Router
- **Backend**: Spring Boot 3, Spring Security, JWT, Hibernate
- **Database**: MySQL 8.0
- **Jobs Fetcher**: Python 3.11, Telethon, mysql-connector
- **AI**: Google Gemini API
- **Storage**: Cloudinary
- **Deployment**: Docker, Docker Compose, Nginx

---

## ⚖️ License

[Your License Here]

---

## 👥 Contributing

[Your Contributing Guidelines]

---

**Last Updated**: December 2025
**Version**: 1.0.0

