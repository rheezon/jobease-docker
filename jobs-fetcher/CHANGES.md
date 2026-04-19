# What Changed

## 1. LinkedIn Integration
- Added `linkedin_ingest.py` - fetches LinkedIn jobs via Google News RSS
- Modified `scheduler.py` - runs both Telegram and LinkedIn fetchers
- Filters: Only saves jobs with HR contact info (email OR apply links)
- Comprehensive job keywords: Software Engineer, Data Scientist, DevOps, Cybersecurity, etc.
- Location-based filtering: India (Bangalore, Hyderabad, Pune, Mumbai, Delhi NCR, Remote)

## 2. Database Schema (2 Tables Only)
- **jobs** - All jobs (Telegram + LinkedIn)
- **hr_contacts** - HR details for LinkedIn jobs only (email, apply_links, company, role)

## 3. Security Fix
- Removed exposed credentials from `.env`
- You need to add your own credentials to `.env` file

## 4. Dependencies
- Added: feedparser, requests, beautifulsoup4, googlenewsdecoder

## Setup
```bash
# Reset database
mysql -u root -p job_notifier < reset_schema.sql

# Install and run
pip install -r requirements.txt
python generate_session.py
python scheduler.py
```

## .env Format
```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=job_notifier
TELEGRAM_SESSION_STRING=your_session
TELEGRAM_GROUPS=Group1,Group2
SCHEDULE_INTERVAL_MS=18000000
```

## Files
- `scheduler.py` - main service
- `ingest.py` - Telegram fetcher
- `linkedin_ingest.py` - LinkedIn fetcher (NEW)
- `reset_schema.sql` - Database reset script (NEW)
