"""
Production scheduler service for Telegram job fetcher
Runs the ingestion task at configurable intervals
"""

import asyncio
import time
import logging
import os
import sys
import io
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote
from dotenv import load_dotenv
import mysql.connector
from ingest import run_fetcher_task
from linkedin_ingest import run_linkedin_fetcher

# Fix UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Load environment variables
load_dotenv()

# Setup scheduler logger
log_dir = os.path.join(os.path.dirname(__file__), 'Logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, 'scheduler.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('Scheduler')

def get_last_fetch_time():
    """Get the last fetch time from database or default to 24 hours ago"""
    try:
        conn = mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            port=int(os.getenv('MYSQL_PORT', 3306)),
            user=os.getenv('MYSQL_USER'),
            password=os.getenv('MYSQL_PASSWORD'),
            database=os.getenv('MYSQL_DB')
        )
        cursor = conn.cursor()
        
        # Get the most recent job_timestamp from jobs table
        cursor.execute("SELECT MAX(job_timestamp) FROM jobs")
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result and result[0]:
            # Ensure timezone-aware
            timestamp = result[0]
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            # Add 1 second to avoid re-fetching the last message
            timestamp = timestamp + timedelta(seconds=1)
            logger.info(f"Resuming from last database entry: {timestamp}")
            return timestamp
        else:
            # No data in table, start from 24 hours ago
            default_time = datetime.now(timezone.utc) - timedelta(hours=24)
            logger.info(f"No previous data found, starting from: {default_time}")
            return default_time
            
    except Exception as e:
        logger.warning(f"Could not query database for last fetch time: {e}")
        # Fallback to 24 hours ago
        default_time = datetime.now(timezone.utc) - timedelta(hours=24)
        logger.info(f"Using default starting time: {default_time}")
        return default_time

def run_task():
    """Execute the fetcher task"""
    logger.info("-" * 60)
    logger.info("Starting scheduled fetch task")
    logger.info("-" * 60)
    
    # Task 1: Telegram job fetcher
    try:
        logger.info("[1/2] Running Telegram job fetcher")
        last_fetch_time = get_last_fetch_time()
        
        config = {
            'last_fetched_at': last_fetch_time
        }
        
        asyncio.run(run_fetcher_task(config))
        logger.info("Telegram fetch completed")
        
        from ingest import TelegramIngestionService
        service = TelegramIngestionService()
        service.cleanup_old_processed()
        
    except Exception as e:
        logger.error(f"Telegram fetch failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
    
    # Task 2: LinkedIn job fetcher
    try:
        logger.info("[2/2] Running LinkedIn job fetcher")
        run_linkedin_fetcher()
        logger.info("LinkedIn fetch completed")
        
    except Exception as e:
        logger.error(f"LinkedIn fetch failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
    
    logger.info("All tasks completed")

def main():
    """Main scheduler loop"""
    # Get configurable schedule interval in milliseconds
    interval_ms = int(os.getenv('SCHEDULE_INTERVAL_MS', 18000000))  # Default: 5 hours = 18000000 ms
    interval_seconds = interval_ms / 1000.0
    
    logger.info("Telegram Job Fetcher Scheduler Started")
    logger.info(f"Schedule: Every {interval_ms} milliseconds ({interval_seconds} seconds)")
    logger.info("Press Ctrl+C to stop")
    
    # Run immediately on startup
    logger.info("Running initial fetch...")
    run_task()
    
    # Keep running with millisecond-based timing
    while True:
        time.sleep(interval_seconds)
        run_task()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\nScheduler stopped by user")
    except Exception as e:
        logger.error(f"Scheduler crashed: {e}")
        import traceback
        logger.error(traceback.format_exc())
