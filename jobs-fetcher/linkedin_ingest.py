"""
LinkedIn job ingestion service via Google News RSS
Fetches LinkedIn job postings and stores HR details in MySQL database
"""

import feedparser
import requests
import re
import os
import logging
import hashlib
from datetime import datetime, timezone
from urllib.parse import unquote, urlparse, parse_qs
from bs4 import BeautifulSoup
from googlenewsdecoder import new_decoderv1
from logging.handlers import TimedRotatingFileHandler
from dotenv import load_dotenv
import mysql.connector

class LinkedInIngestionService:
    def __init__(self):
        self.logger = self._setup_logger()
        load_dotenv()
        
        # Build RSS URL with comprehensive job keywords
        keywords = [
            # Tech/IT roles
            '"Software Engineer"', '"Software Developer"', '"Full Stack Developer"',
            '"Backend Developer"', '"Frontend Developer"', '"Data Scientist"',
            '"Data Analyst"', '"ML Engineer"', '"AI Engineer"', '"DevOps Engineer"',
            '"Cloud Engineer"', '"Cybersecurity Analyst"', '"Network Engineer"',
            '"Network Security"', '"SOC Analyst"', '"Compliance Engineer"',
            '"GRC Engineer"', '"IT Support"', '"QA Engineer"', '"SDET"',
            '"DevSecOps"', '"Cloud Security"', '"Security Engineer"',
            '"DevOps SRE"', '"AI Security"', '"IoT"', '"IoT Security"',
            
            # Business/Management
            '"Business Analyst"', '"Product Manager"', '"Project Manager"',
            '"Operations Manager"', '"Strategy Consultant"',
            
            # Marketing/Sales
            '"Digital Marketing"', '"Performance Marketer"', '"SEO Specialist"',
            '"Content Strategist"', '"Social Media Manager"', '"Sales Executive"',
            '"Business Development"',
            
            # Finance/HR
            '"Financial Analyst"', '"Investment Analyst"', '"Accountant"',
            '"HR Manager"', '"Talent Acquisition"', '"Recruiter"',
            
            # Design
            '"UI Designer"', '"UX Designer"', '"Product Designer"',
            '"Graphic Designer"',
            
            # Experience levels
            '"Fresher"', '"Entry Level"', '"Internship"', '"Associate"',
            
            # Locations (India focus)
            '"India"', '"Bangalore"', '"Bengaluru"', '"Hyderabad"', '"Pune"',
            '"Mumbai"', '"Delhi NCR"', '"Gurgaon"', '"Noida"', '"Remote"',
            '"Work From Home"'
        ]
        
        keyword_query = ' OR '.join(keywords)
        self.rss_url = os.getenv('LINKEDIN_RSS_URL',
            f'https://news.google.com/rss/search?q=site:linkedin.com/posts+("hiring" OR "we are hiring")+({keyword_query})&hl=en-IN&gl=IN&ceid=IN:en')
        
        self.headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }
        
        self.ensure_tables_exist()
    
    def _get_db_connection(self):
        """Get MySQL connection from environment variables"""
        return mysql.connector.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            port=int(os.getenv('MYSQL_PORT', 3306)),
            user=os.getenv('MYSQL_USER'),
            password=os.getenv('MYSQL_PASSWORD'),
            database=os.getenv('MYSQL_DB')
        )
    
    def _setup_logger(self):
        logger = logging.getLogger('LinkedInIngestion')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            log_dir = os.path.join(os.path.dirname(__file__), 'Logs')
            os.makedirs(log_dir, exist_ok=True)
            
            handler = TimedRotatingFileHandler(
                os.path.join(log_dir, 'linkedin_ingest.log'),
                when='h',
                interval=12,
                backupCount=6,
                encoding='utf-8'
            )
            
            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def ensure_tables_exist(self):
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Create jobs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    created_at DATETIME(6) NOT NULL,
                    hash_id BIGINT,
                    job VARCHAR(5000) NOT NULL,
                    job_timestamp DATETIME(6),
                    processed BIT(1) NOT NULL,
                    timestamp DATETIME(6) NOT NULL,
                    INDEX idx_hash_id (hash_id)
                )
            """)
            
            # Create hr_contacts table for LinkedIn HR details
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS hr_contacts (
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
                )
            """)
            
            conn.commit()
            self.logger.info("Database schema ensured: jobs, hr_contacts")
            
        except Exception as e:
            self.logger.error(f"Error ensuring database schema: {e}")
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
    
    def _generate_text_hash(self, text):
        if not text:
            return hashlib.sha256(b'').hexdigest()
        
        normalized = text.lower()
        normalized = re.sub(r'http[s]?://\S+', '', normalized)
        normalized = re.sub(r'[^\w\s]', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    
    def resolve_google_news_url(self, url):
        try:
            result = new_decoderv1(url)
            if result.get("status"):
                return result.get("decoded_url", url)
        except:
            pass
        return url
    
    def fetch_page(self, url):
        try:
            return requests.get(url, headers=self.headers, timeout=10)
        except Exception as e:
            self.logger.warning(f"Error fetching page: {e}")
            return None
    
    def extract_role(self, text):
        patterns = [
            # Tech/IT roles
            r"(software engineer|software developer|full stack developer|backend developer|frontend developer)",
            r"(data scientist|data analyst|ml engineer|machine learning engineer|ai engineer)",
            r"(devops engineer|cloud engineer|cybersecurity analyst|network engineer|network security)",
            r"(soc analyst|compliance engineer|grc engineer|it support|qa engineer|sdet)",
            r"(devsecops|cloud security|security engineer|devops sre|ai security|iot|iot security)",
            r"(blockchain developer|forensic analyst)",
            
            # Business/Management
            r"(business analyst|product manager|project manager|program manager|operations manager)",
            r"(strategy consultant|management consultant)",
            
            # Marketing/Sales
            r"(digital marketing manager|performance marketer|seo specialist|content strategist)",
            r"(social media manager|growth hacker|sales executive|business development executive)",
            
            # Finance/HR
            r"(financial analyst|investment analyst|accountant|hr manager)",
            r"(talent acquisition specialist|recruiter)",
            
            # Design
            r"(ui designer|ux designer|product designer|graphic designer|motion designer)",
            
            # Generic fallback
            r"(developer|engineer|analyst|manager|designer|specialist)"
        ]
        
        text_lower = text.lower()
        
        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                return match.group(1).title()
        
        match = re.search(r"role[:\- ]+(.+)", text_lower)
        if match:
            return match.group(1).split("\n")[0].strip().title()
        
        return "Unknown"
    
    def extract_company(self, text):
        patterns = [
            r"at ([A-Z][a-zA-Z0-9& ]+)",
            r"join ([A-Z][a-zA-Z0-9& ]+)",
            r"([A-Z][a-zA-Z0-9& ]+) is hiring"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        
        return "Unknown"
    
    def extract_email(self, text):
        match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}", text)
        return match.group(0) if match else None
    
    def unwrap_linkedin_url(self, url):
        """Resolve lnkd.in shorteners and linkedin.com/redir wrappers to the real URL."""
        if 'linkedin.com/redir' in url:
            qs = parse_qs(urlparse(url).query)
            if 'url' in qs:
                return unquote(qs['url'][0])

        if 'lnkd.in/' in url:
            try:
                res = requests.get(url, headers=self.headers, timeout=10)
                soup = BeautifulSoup(res.text, 'html.parser')
                anchor = soup.find('a', {'data-tracking-control-name': 'external_url_click'})
                if anchor and anchor.get('href'):
                    return anchor['href']
            except Exception as e:
                self.logger.warning(f"Failed to unwrap lnkd.in URL {url}: {e}")

        return url

    def extract_apply_links(self, text):
        urls = re.findall(r"https?://[^\s]+", text)

        # Domains to reject — social media, shorteners, aggregators
        blocked_domains = [
            't.me', 'telegram.me', 'telegram.org',
            'wa.me', 'whatsapp.com', 'chat.whatsapp.com',
            'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
            'youtube.com', 'youtu.be', 'discord.gg', 'discord.com',
            'reddit.com', 'hubs.ly', 'bit.ly', 'tinyurl.com',
        ]

        apply_links = []
        for url in urls:
            url = url.strip(").,]\"'")
            url_lower = url.lower()
            if not any(domain in url_lower for domain in blocked_domains):
                url = self.unwrap_linkedin_url(url)
                apply_links.append(url)

        return list(set(apply_links))
    
    def scrape_post(self, url):
        real_url = self.resolve_google_news_url(url)
        
        if "linkedin.com" not in real_url:
            return None
        
        res = self.fetch_page(real_url)
        if not res:
            return None
        
        try:
            soup = BeautifulSoup(res.text, "html.parser")
        except:
            return None

        # Remove non-content elements
        for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)

        # Cut off at comments/reactions section
        # Cut off using regex for flexible whitespace matching
        cutoff_patterns = [
            r'\d+\s*Comments',
            r'Like\s+Comment\s+Share',
            r'Comment\s+Share',
            r'To view or add a comment',
            r'More Relevant Posts',
            r'Sign in\s+Join now',
            r'Agree & Join LinkedIn',
            r'Copy\s+LinkedIn\s+Facebook',
        ]
        for pattern in cutoff_patterns:
            match = re.search(pattern, text)
            if match and match.start() > 100:
                text = text[:match.start()].strip()
                break

        # Remove LinkedIn boilerplate from the start
        start_markers = ['Report this post', 'Report this activity']
        for marker in start_markers:
            idx = text.find(marker)
            if idx != -1 and idx < 500:
                text = text[idx + len(marker):].strip()
                break

        # Remove excessive blank lines
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Remove hashtags (e.g. #Hiring #TechMahindra)
        text = re.sub(r'#\w+', '', text)
        text = re.sub(r'\n{2,}', '\n\n', text).strip()

        # Remove tagged people (lines that are just names)
        text = re.sub(r'\n[A-Z][a-z]+ [A-Z][a-z]+(?:\n[A-Z][a-z]+ [A-Z][a-z]+)+', '', text)

        # Remove emoji-heavy lines (lines that are mostly emojis/symbols)
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            if line.strip():
                alpha_chars = sum(1 for c in line if c.isalpha())
                if alpha_chars / max(len(line.strip()), 1) > 0.3:
                    cleaned_lines.append(line)
            else:
                cleaned_lines.append(line)
        text = '\n'.join(cleaned_lines).strip()

        # Cap text length — backend Gemini handles the rest
        if len(text) > 2000:
            text = text[:2000].rsplit('\n', 1)[0].strip()

        return {
            "role": self.extract_role(text),
            "company": self.extract_company(text),
            "email": self.extract_email(text),
            "apply_links": self.extract_apply_links(text),
            "url": real_url,
            "text": text
        }
    
    def save_jobs_to_db(self, jobs):
        if not jobs:
            self.logger.info("No jobs to save")
            return
        
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            inserted = 0
            skipped = 0
            
            for job in jobs:
                try:
                    text_hash = hash(job['text'])  # Simple hash for deduplication
                    
                    # Check if job already exists
                    cursor.execute(
                        "SELECT id FROM jobs WHERE hash_id = %s",
                        (text_hash,)
                    )
                    existing = cursor.fetchone()
                    
                    if existing:
                        skipped += 1
                        continue
                    
                    # Insert job into jobs table (truncate if too long)
                    job_text = job['text'][:4900]  # Keep under 5000 limit
                    
                    cursor.execute(
                        """
                        INSERT INTO jobs (created_at, hash_id, job, job_timestamp, processed, timestamp)
                        VALUES (NOW(6), %s, %s, NOW(6), 0, NOW(6))
                        """,
                        (text_hash, job_text)
                    )
                    
                    job_id = cursor.lastrowid
                    
                    # Insert HR details into hr_contacts table
                    apply_links_str = ','.join(job['apply_links']) if job['apply_links'] else None
                    
                    cursor.execute(
                        """
                        INSERT INTO hr_contacts (job_id, email, apply_links, company, role, source_url, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, NOW(6))
                        """,
                        (job_id, job['email'], apply_links_str, job['company'], job['role'], job['url'])
                    )
                    
                    inserted += 1
                        
                except Exception as e:
                    self.logger.error(f"Error processing job: {e}")
                    skipped += 1
                    continue
            
            conn.commit()
            self.logger.info(f"Inserted {inserted} new jobs with HR details, skipped {skipped} duplicates")
            
        except Exception as e:
            self.logger.error(f"Database error: {e}")
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
    
    def _get_existing_urls(self):
        """Fetch all source_urls already in hr_contacts to skip re-scraping"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT source_url FROM hr_contacts WHERE source_url IS NOT NULL")
            urls = {row[0] for row in cursor.fetchall()}
            cursor.close()
            conn.close()
            return urls
        except Exception as e:
            self.logger.warning(f"Could not fetch existing URLs: {e}")
            return set()

    def process_rss(self):
        self.logger.info("Starting LinkedIn job fetch")

        try:
            feed = feedparser.parse(self.rss_url)
            existing_urls = self._get_existing_urls()
            self.logger.info(f"Found {len(existing_urls)} already-processed URLs in DB")

            jobs = []

            for entry in feed.entries[:50]:
                try:
                    self.logger.info(f"Processing: {entry.title}")

                    real_url = self.resolve_google_news_url(entry.link)
                    if real_url in existing_urls:
                        self.logger.info("Skipping - already in database")
                        continue

                    data = self.scrape_post(entry.link)
                    
                    if not data:
                        self.logger.warning("Failed to scrape post")
                        continue

                    text = data['text']

                    # Filter: Non-English posts (less than 50% ASCII)
                    if text:
                        ascii_chars = sum(1 for c in text if ord(c) < 128)
                        if ascii_chars / max(len(text), 1) < 0.5:
                            self.logger.info("Skipping - non-English post")
                            continue

                    # Filter: "DM resume" posts (no real apply link)
                    if re.search(r'\bDM\s+(resume|me|your)\b', text, re.IGNORECASE):
                        self.logger.info("Skipping - DM resume post")
                        continue

                    # Filter: Personal stories/opinions (no job-related action words)
                    job_signals = r'(hiring|openings?|apply|application|vacancy|position|opportunity|recruit|job role|walk.?in|eligib)'
                    if not re.search(job_signals, text, re.IGNORECASE):
                        self.logger.info("Skipping - no job signals found (likely opinion/story post)")
                        continue

                    # Filter: Skip if no apply link and no email
                    if not data['apply_links'] and not data['email']:
                        self.logger.info("Skipping - no apply link or email found")
                        continue

                    # Filter: If no recognized role AND no apply link/email, skip
                    # (posts with apply link but unknown role are kept — Gemini extracts the role)
                    if data['role'] == "Unknown" and not data['apply_links'] and not data['email']:
                        self.logger.info("Skipping - no clear job role and no apply info")
                        continue

                    # Filter: Skip posts with multiple apply links (likely aggregator/spam)
                    if len(data['apply_links']) > 1:
                        self.logger.info(f"Skipping - multiple apply links found ({len(data['apply_links'])})")
                        continue
                    
                    jobs.append(data)
                    
                except Exception as e:
                    self.logger.error(f"Error processing entry: {e}")
                    continue
            
            self.logger.info(f"Total jobs with HR details: {len(jobs)}")
            
            if jobs:
                self.save_jobs_to_db(jobs)
            else:
                self.logger.info("No jobs with HR contact info found")
                
        except Exception as e:
            self.logger.error(f"Error during RSS processing: {e}")

def run_linkedin_fetcher():
    service = LinkedInIngestionService()
    service.process_rss()

if __name__ == "__main__":
    run_linkedin_fetcher()
