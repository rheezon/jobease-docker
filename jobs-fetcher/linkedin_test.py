"""
Local test script for LinkedIn job ingestion — no MySQL, prints to console only.
Usage: python linkedin_test.py
"""

import feedparser
import requests
import re
import os
import logging
import hashlib
from datetime import datetime, timezone
from urllib.parse import unquote, quote
from bs4 import BeautifulSoup
from googlenewsdecoder import new_decoderv1
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('LinkedInTest')

# Build RSS URL with comprehensive job keywords
keywords = [
    '"Software Engineer"', '"Software Developer"', '"Full Stack Developer"',
    '"Backend Developer"', '"Frontend Developer"', '"Data Scientist"',
    '"Data Analyst"', '"ML Engineer"', '"AI Engineer"', '"DevOps Engineer"',
    '"Cloud Engineer"', '"Cybersecurity Analyst"', '"Network Engineer"',
    '"Network Security"', '"SOC Analyst"', '"Compliance Engineer"',
    '"GRC Engineer"', '"IT Support"', '"QA Engineer"', '"SDET"',
    '"DevSecOps"', '"Cloud Security"', '"Security Engineer"',
    '"DevOps SRE"', '"AI Security"', '"IoT"', '"IoT Security"',
    '"Business Analyst"', '"Product Manager"', '"Project Manager"',
    '"Operations Manager"', '"Strategy Consultant"',
    '"Digital Marketing"', '"Performance Marketer"', '"SEO Specialist"',
    '"Content Strategist"', '"Social Media Manager"', '"Sales Executive"',
    '"Business Development"',
    '"Financial Analyst"', '"Investment Analyst"', '"Accountant"',
    '"HR Manager"', '"Talent Acquisition"', '"Recruiter"',
    '"UI Designer"', '"UX Designer"', '"Product Designer"', '"Graphic Designer"',
    '"Fresher"', '"Entry Level"', '"Internship"', '"Associate"',
    '"India"', '"Bangalore"', '"Bengaluru"', '"Hyderabad"', '"Pune"',
    '"Mumbai"', '"Delhi NCR"', '"Gurgaon"', '"Noida"', '"Remote"',
    '"Work From Home"'
]

keyword_query = ' OR '.join(keywords)
_default_query = f'site:linkedin.com/posts+("hiring" OR "we are hiring")+({keyword_query})'
_default_rss = f'https://news.google.com/rss/search?q={quote(_default_query)}&hl=en-IN&gl=IN&ceid=IN:en'
RSS_URL = os.getenv('LINKEDIN_RSS_URL', _default_rss)

HEADERS = {"User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9"}

BLOCKED_DOMAINS = [
    't.me', 'telegram.me', 'telegram.org',
    'wa.me', 'whatsapp.com', 'chat.whatsapp.com',
    'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
    'youtube.com', 'youtu.be', 'discord.gg', 'discord.com',
    'reddit.com',
]


def resolve_google_news_url(url):
    try:
        result = new_decoderv1(url)
        if result.get("status"):
            return result.get("decoded_url", url)
    except:
        pass
    return url


def fetch_page(url):
    try:
        return requests.get(url, headers=HEADERS, timeout=10)
    except Exception as e:
        logger.warning(f"Error fetching page: {e}")
        return None


def extract_role(text):
    patterns = [
        r"(software engineer|software developer|full stack developer|backend developer|frontend developer)",
        r"(data scientist|data analyst|ml engineer|machine learning engineer|ai engineer)",
        r"(devops engineer|cloud engineer|cybersecurity analyst|network engineer|network security)",
        r"(soc analyst|compliance engineer|grc engineer|it support|qa engineer|sdet)",
        r"(devsecops|cloud security|security engineer|devops sre|ai security|iot|iot security)",
        r"(blockchain developer|forensic analyst)",
        r"(business analyst|product manager|project manager|program manager|operations manager)",
        r"(strategy consultant|management consultant)",
        r"(digital marketing manager|performance marketer|seo specialist|content strategist)",
        r"(social media manager|growth hacker|sales executive|business development executive)",
        r"(financial analyst|investment analyst|accountant|hr manager)",
        r"(talent acquisition specialist|recruiter)",
        r"(ui designer|ux designer|product designer|graphic designer|motion designer)",
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


def extract_company(text):
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


def extract_email(text):
    match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}", text)
    return match.group(0) if match else None


def extract_apply_links(text):
    urls = re.findall(r"https?://[^\s]+", text)
    apply_links = []
    for url in urls:
        url = url.strip(").,]\"'")
        url_lower = url.lower()
        if not any(domain in url_lower for domain in BLOCKED_DOMAINS):
            apply_links.append(url)
    return list(set(apply_links))


def scrape_post(url):
    real_url = resolve_google_news_url(url)
    if "linkedin.com" not in real_url:
        return None
    res = fetch_page(real_url)
    if not res:
        return None
    try:
        soup = BeautifulSoup(res.text, "html.parser")
    except:
        return None

    for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)

    cutoff_markers = [
        'Comments', 'Like\nComment\nShare', 'Comment\nShare',
        'To view or add a comment', 'More Relevant Posts',
        'Sign in\nJoin now', 'Agree & Join LinkedIn'
    ]
    for marker in cutoff_markers:
        idx = text.find(marker)
        if idx > 100:
            text = text[:idx].strip()
            break

    start_markers = ['Report this post', 'Report this activity']
    for marker in start_markers:
        idx = text.find(marker)
        if idx != -1 and idx < 500:
            text = text[idx + len(marker):].strip()
            break

    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'#\w+', '', text)
    text = re.sub(r'\n{2,}', '\n\n', text).strip()
    text = re.sub(r'\n[A-Z][a-z]+ [A-Z][a-z]+(?:\n[A-Z][a-z]+ [A-Z][a-z]+)+', '', text)

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

    if len(text) > 2000:
        text = text[:2000].rsplit('\n', 1)[0].strip()

    return {
        "role": extract_role(text),
        "company": extract_company(text),
        "email": extract_email(text),
        "apply_links": extract_apply_links(text),
        "url": real_url,
        "text": text
    }


def main():
    logger.info(f"Fetching RSS feed...")
    feed = feedparser.parse(RSS_URL)
    logger.info(f"Found {len(feed.entries)} entries")

    accepted = []
    skipped = 0

    for i, entry in enumerate(feed.entries[:50]):
        logger.info(f"[{i+1}] Processing: {entry.title[:80]}...")

        data = scrape_post(entry.link)
        if not data:
            logger.info("  -> SKIP: Failed to scrape")
            skipped += 1
            continue

        text = data['text']
        skip_reason = None

        if text:
            ascii_chars = sum(1 for c in text if ord(c) < 128)
            if ascii_chars / max(len(text), 1) < 0.5:
                skip_reason = "Non-English post"

        if not skip_reason and re.search(r'\bDM\s+(resume|me|your)\b', text, re.IGNORECASE):
            skip_reason = "DM resume post"

        if not skip_reason:
            job_signals = r'(hiring|openings?|apply|application|vacancy|position|opportunity|recruit|job role|walk.?in|eligib)'
            if not re.search(job_signals, text, re.IGNORECASE):
                skip_reason = "No job signals (opinion/story)"

        if not skip_reason and not data['apply_links'] and not data['email']:
            skip_reason = "No apply link or email"

        if not skip_reason and data['role'] == "Unknown" and not data['apply_links'] and not data['email']:
            skip_reason = "No role and no apply info"

        if not skip_reason and len(data['apply_links']) > 1:
            skip_reason = f"Multiple apply links ({len(data['apply_links'])})"

        status = "SKIPPED" if skip_reason else "ACCEPTED"
        if skip_reason:
            skipped += 1
        else:
            accepted.append(data)

        print(f"\n{'=' * 80}")
        print(f"  [{status}] Job #{len(accepted) if not skip_reason else f'- Reason: {skip_reason}'}")
        print(f"  Role:    {data['role']}")
        print(f"  Company: {data['company']}")
        print(f"  Email:   {data['email']}")
        print(f"  Links:   {data['apply_links']}")
        print(f"  URL:     {data['url']}")
        print(f"  Text:\n{data['text']}")
        print(f"{'=' * 80}")

    print(f"\nDONE: {len(accepted)} accepted, {skipped} skipped")


if __name__ == "__main__":
    main()
