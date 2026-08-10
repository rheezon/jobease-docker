# Job Notifier - Telegram & LinkedIn Ingestion Service

A production-ready Python service that fetches job postings from Telegram groups and LinkedIn (via Google News RSS) and stores them in MySQL.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Generate Telegram Session
```bash
python generate_session.py
```

### 4. Start Service
```bash
python scheduler.py
```

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------||
| `TELEGRAM_SESSION_STRING` | Session for authentication | From generate_session.py |
| `TELEGRAM_GROUPS` | Comma-separated groups | `"Tech Jobs,Dev Careers"` |
| `MYSQL_HOST` | MySQL host | `localhost` |
| `MYSQL_PORT` | MySQL port | `3306` |
| `MYSQL_USER` | MySQL username | `root` |
| `MYSQL_PASSWORD` | MySQL password | `your_password` |
| `MYSQL_DB` | MySQL database name | `job_notifier` |
| `SCHEDULE_INTERVAL_MS` | Fetch interval | `18000000` (5 hours) |
| `LINKEDIN_RSS_URL` | LinkedIn RSS feed | See .env.example |

### Database Schema

**Jobs Table (Both Telegram & LinkedIn):**
```sql
CREATE TABLE jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    hash_id BIGINT,
    job VARCHAR(5000) NOT NULL,
    job_timestamp DATETIME(6),
    processed BIT(1) NOT NULL,
    timestamp DATETIME(6) NOT NULL,
    INDEX idx_hash_id (hash_id)
);
```

**HR Contacts Table (LinkedIn only):**
```sql
CREATE TABLE hr_contacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    email VARCHAR(255),
    apply_links TEXT,
    company VARCHAR(500),
    role VARCHAR(500),
    source_url TEXT,
    created_at DATETIME(6) NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    INDEX idx_job_id (job_id)
);
```

## File Structure

```
├── scheduler.py          # Main service
├── ingest.py            # Telegram fetcher
├── linkedin_ingest.py   # LinkedIn fetcher
├── generate_session.py  # Session generator
├── requirements.txt     # Dependencies
├── .env.example         # Config template
└── Logs/                # Auto-created logs
```

## Security

- Never commit `.env` or `*.session` files
- Rotate credentials regularly

## Monitoring

```bash
tail -f Logs/scheduler.log
tail -f Logs/ingest.log
tail -f Logs/linkedin_ingest.log
```