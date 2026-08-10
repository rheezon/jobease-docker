#!/usr/bin/env python3
"""
LinkedIn Company ID Fetcher
============================

This script helps you extract LinkedIn company IDs from company pages.
Company IDs are used for accurate employee searches on LinkedIn.

Installation:
    pip install selenium webdriver-manager

Usage:
    # Interactive mode (opens browser)
    python fetch_linkedin_company_ids.py

    # Single company
    python fetch_linkedin_company_ids.py --url https://www.linkedin.com/company/google/

    # Batch mode with file
    python fetch_linkedin_company_ids.py --file companies.txt

    # companies.txt format (one per line):
    # https://www.linkedin.com/company/google/
    # https://www.linkedin.com/company/microsoft/
    # google
    # microsoft

Author: JobEase Team
"""

import time
import json
import re
import sys
import argparse
from typing import Optional, Dict, List

# Comprehensive list of popular companies on LinkedIn
POPULAR_COMPANIES = {
    "Tech Giants": [
        "google", "microsoft", "apple", "amazon", "meta", "facebook",
        "netflix", "tesla", "ibm", "oracle", "salesforce", "adobe",
        "intel", "nvidia", "amd", "qualcomm", "cisco", "dell",
    ],
    
    "Social Media & Communication": [
        "linkedin", "twitter", "x", "instagram", "whatsapp", "snapchat",
        "pinterest", "reddit", "discord", "telegram", "zoom", "slack",
        "tiktok", "youtube",
    ],
    
    "E-commerce & Retail": [
        "walmart", "target", "alibaba", "ebay", "shopify", "etsy",
        "wayfair", "bestbuy", "costco", "ikea", "nike", "adidas",
    ],
    
    "Indian Tech Companies": [
        "tcs", "infosys", "wipro", "hcl-technologies", "tech-mahindra",
        "cognizant", "ltimindtree", "persistent-systems", "mphasis",
        "cyient", "hexaware-technologies", "mindtree",
    ],
    
    "Indian Startups & Unicorns": [
        "zomato", "swiggy", "paytm", "phonepe", "razorpay", "cred",
        "meesho", "zerodha", "groww", "policybazaar", "byju",
        "unacademy", "ola", "ola-electric", "flipkart", "myntra",
        "urban-company", "lenskart", "nykaa", "firstcry", "dunzo",
        "bigbasket", "blinkit", "delhivery", "shadowfax", "shiprocket",
        "postman", "freshworks", "zoho", "browserstack", "druva",
        "icertis", "hashedin", "directi", "wingify",
    ],
    
    "Fintech": [
        "stripe", "square", "paypal", "visa", "mastercard", "revolut",
        "robinhood", "coinbase", "plaid", "klarna", "affirm", "nubank",
        "chime", "n26", "transferwise", "wise", "monzo", "starling-bank",
    ],
    
    "Consulting Firms": [
        "mckinsey", "bcg", "boston-consulting-group", "bain",
        "deloitte", "pwc", "ey", "kpmg", "accenture", "capgemini",
        "cognizant", "dxc-technology", "atos", "genpact",
    ],
    
    "Investment Banks & Financial Services": [
        "goldman-sachs", "jpmorgan", "morgan-stanley", "bank-of-america",
        "citigroup", "wells-fargo", "hsbc", "barclays", "deutsche-bank",
        "credit-suisse", "ubs", "blackrock", "vanguard", "fidelity",
    ],
    
    "Indian Banks": [
        "hdfc-bank", "icici-bank", "axis-bank", "state-bank-of-india",
        "kotak-mahindra-bank", "yes-bank", "indusind-bank", "idfc-first-bank",
    ],
    
    "Cloud & Infrastructure": [
        "aws", "amazon-web-services", "microsoft-azure", "google-cloud",
        "digitalocean", "linode", "vultr", "cloudflare", "fastly",
        "datadog", "new-relic", "splunk", "elastic",
    ],
    
    "Ride Sharing & Transportation": [
        "uber", "lyft", "grab", "didi", "ola-cabs", "bolt",
        "lime", "bird", "gojek",
    ],
    
    "Food Delivery": [
        "doordash", "uber-eats", "grubhub", "deliveroo", "just-eat",
        "zomato", "swiggy", "dunzo",
    ],
    
    "Travel & Hospitality": [
        "airbnb", "booking", "expedia", "tripadvisor", "marriott",
        "hilton", "hyatt", "oyo", "makemytrip", "goibibo", "cleartrip",
    ],
    
    "Automotive": [
        "tesla", "ford", "general-motors", "toyota", "volkswagen",
        "bmw", "mercedes-benz", "audi", "honda", "nissan", "rivian",
        "lucid-motors", "nio", "waymo", "cruise",
    ],
    
    "Media & Entertainment": [
        "disney", "warner-bros", "paramount", "universal-pictures",
        "sony-pictures", "hulu", "hbo", "spotify", "apple-music",
        "soundcloud", "twitch", "vimeo",
    ],
    
    "Gaming": [
        "activision-blizzard", "electronic-arts", "ubisoft", "riot-games",
        "epic-games", "valve", "roblox", "unity-technologies",
        "unreal-engine", "rockstar-games", "bethesda",
    ],
    
    "Cybersecurity": [
        "crowdstrike", "palo-alto-networks", "fortinet", "cloudflare",
        "okta", "zscaler", "splunk", "rapid7", "tenable",
        "qualys", "imperva", "mcafee", "symantec", "checkpoint",
    ],
    
    "SaaS & Enterprise Software": [
        "salesforce", "servicenow", "workday", "atlassian", "monday",
        "asana", "notion", "airtable", "hubspot", "zendesk",
        "intercom", "drift", "segment", "amplitude", "mixpanel",
    ],
    
    "E-Learning & EdTech": [
        "coursera", "udemy", "pluralsight", "linkedin-learning",
        "skillshare", "duolingo", "byju", "unacademy", "vedantu",
        "toppr", "whitehat-jr", "upgrad", "great-learning",
    ],
    
    "Healthcare & Biotech": [
        "pfizer", "moderna", "johnson-johnson", "astrazeneca",
        "novartis", "roche", "merck", "gilead", "regeneron",
        "illumina", "23andme", "color-genomics",
    ],
    
    "Hardware & Electronics": [
        "apple", "samsung", "sony", "lg", "panasonic", "philips",
        "xiaomi", "oppo", "vivo", "oneplus", "realme", "nothing",
    ],
    
    "Semiconductors": [
        "nvidia", "amd", "intel", "tsmc", "qualcomm", "broadcom",
        "micron", "texas-instruments", "arm", "mediatek",
    ],
    
    "Aerospace & Defense": [
        "spacex", "blue-origin", "boeing", "lockheed-martin",
        "northrop-grumman", "raytheon", "airbus", "nasa",
    ],
    
    "Crypto & Blockchain": [
        "coinbase", "binance", "kraken", "gemini", "ftx",
        "blockchain", "circle", "ripple", "consensys",
    ],
}

def get_all_companies() -> List[str]:
    """Get flattened list of all companies"""
    companies = []
    for category in POPULAR_COMPANIES.values():
        companies.extend(category)
    return companies

def print_company_categories():
    """Print all available company categories"""
    print("\n📋 Available Company Categories:\n")
    for i, (category, companies) in enumerate(POPULAR_COMPANIES.items(), 1):
        print(f"{i}. {category} ({len(companies)} companies)")
    print(f"\nTotal: {len(get_all_companies())} companies\n")

def get_companies_by_category(category_name: str) -> List[str]:
    """Get companies from a specific category"""
    return POPULAR_COMPANIES.get(category_name, [])

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    print("❌ Required packages not installed!")
    print("\nPlease run:")
    print("  pip install selenium webdriver-manager")
    sys.exit(1)


class LinkedInCompanyIDFetcher:
    """Fetches LinkedIn company IDs from company pages"""
    
    def __init__(self, headless: bool = False, use_existing: bool = False):
        self.driver = None
        self.headless = headless
        self.use_existing = use_existing
        self.logged_in = False
        
    def setup_driver(self):
        """Setup Chrome driver with options"""
        print("🔧 Setting up Chrome driver...")
        
        chrome_options = Options()
        
        if self.use_existing:
            # Connect to existing Chrome instance
            print("📌 Connecting to existing Chrome browser...")
            print("\n⚠️  IMPORTANT: Make sure Chrome is running with remote debugging:")
            print("   Close all Chrome windows first, then run:")
            print("   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222")
            print("\n   Or on Linux/Windows:")
            print("   chrome --remote-debugging-port=9222")
            print("\n   Then press Enter to continue...")
            input()
            
            chrome_options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
            
            try:
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                print("✅ Connected to existing Chrome session!\n")
                self.logged_in = True  # Assume already logged in
                return
            except Exception as e:
                print(f"❌ Failed to connect: {e}")
                print("\nMake sure Chrome is running with --remote-debugging-port=9222")
                sys.exit(1)
        
        # Normal mode - open new browser
        if self.headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # User agent
        chrome_options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        print("✅ Driver ready!\n")
        
    def ensure_login(self):
        """Navigate to LinkedIn and wait for login if needed"""
        if self.logged_in:
            return
            
        print("🔐 Checking LinkedIn authentication...")
        self.driver.get("https://www.linkedin.com")
        time.sleep(2)
        
        # Check if already logged in
        current_url = self.driver.current_url
        if "feed" in current_url or "mynetwork" in current_url:
            print("✅ Already logged in!\n")
            self.logged_in = True
            return
        
        print("\n" + "="*60)
        print("⚠️  MANUAL LOGIN REQUIRED")
        print("="*60)
        print("\nThe browser window has opened.")
        print("Please log in to LinkedIn manually in the browser.")
        print("\nPress Enter here after you've successfully logged in...")
        print("="*60 + "\n")
        
        input()
        self.logged_in = True
        print("✅ Login confirmed!\n")
        
    def normalize_url(self, company_input: str) -> str:
        """Convert company name or URL to full LinkedIn URL"""
        company_input = company_input.strip()
        
        # Already a full URL
        if company_input.startswith("http"):
            return company_input
        
        # Remove linkedin.com/company/ prefix if present
        if company_input.startswith("linkedin.com/company/"):
            company_input = company_input.replace("linkedin.com/company/", "")
        
        # Just a slug
        return f"https://www.linkedin.com/company/{company_input}/"
        
    def extract_company_id(self, url: str) -> Optional[str]:
        """Extract company ID from LinkedIn company page"""
        try:
            print(f"🔍 Fetching: {url}")
            self.driver.get(url)
            
            # Wait longer for page to fully load
            time.sleep(5)
            
            page_source = self.driver.page_source
            
            # Try multiple patterns to find company ID
            patterns = [
                # Ad library link pattern (from href="companyIds=1441")
                r'companyIds=(\d+)',
                r'companyIds%3D(\d+)',
                
                # Original patterns
                r'"companyId":"(\d+)"',
                r'"companyIds":"(\d+)"',
                r'"companyUrn":"urn:li:company:(\d+)"',
                r'"entityUrn":"urn:li:fs_normalized_company:(\d+)"',
                r'"trackingUrn":"urn:li:company:(\d+)"',
                r'urn:li:fsd_company:(\d+)',
                r'company/(\d+)/',
                r'company:(\d+)',
                
                # Additional patterns
                r'"objectUrn":"urn:li:company:(\d+)"',
                r'urn%3Ali%3Acompany%3A(\d+)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, page_source)
                if matches:
                    # Return the most common ID if multiple found
                    from collections import Counter
                    company_id = Counter(matches).most_common(1)[0][0]
                    return company_id
            
            # Check meta tags
            try:
                meta_tag = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="al:ios:url"]')
                content = meta_tag.get_attribute('content')
                match = re.search(r'company/(\d+)', content)
                if match:
                    return match.group(1)
            except:
                pass
            
            # Check for ad-library link specifically
            try:
                ad_link = self.driver.find_element(By.CSS_SELECTOR, 'a[href*="companyIds="]')
                href = ad_link.get_attribute('href')
                match = re.search(r'companyIds=(\d+)', href)
                if match:
                    return match.group(1)
            except:
                pass
            
            return None
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    def get_company_name(self) -> Optional[str]:
        """Extract company name from page title"""
        try:
            title = self.driver.title
            # Remove " | LinkedIn" and clean up
            name = title.split('|')[0].strip()
            # Convert to lowercase and remove common suffixes for mapping
            name = re.sub(
                r'\s+(inc\.?|ltd\.?|llc\.?|pvt\.?|limited|corporation|corp\.?|company|co\.?)$',
                '', name, flags=re.IGNORECASE
            ).strip().lower()
            return name
        except:
            return None
    
    def fetch_single(self, company_input: str) -> Optional[Dict[str, str]]:
        """Fetch company ID for a single company"""
        url = self.normalize_url(company_input)
        company_id = self.extract_company_id(url)
        
        if company_id:
            company_name = self.get_company_name()
            if company_name:
                print(f"✅ {company_name} → {company_id}\n")
                return {"name": company_name, "id": company_id}
            else:
                print(f"✅ ID: {company_id} (couldn't extract name)\n")
                return {"name": "unknown", "id": company_id}
        else:
            print(f"❌ Could not find company ID\n")
            return None
    
    def fetch_batch(self, companies: List[str]) -> Dict[str, str]:
        """Fetch company IDs for multiple companies"""
        results = {}
        total = len(companies)
        
        for i, company in enumerate(companies, 1):
            print(f"\n[{i}/{total}] Processing: {company}")
            print("-" * 60)
            
            result = self.fetch_single(company)
            if result and result["name"] != "unknown":
                results[result["name"]] = result["id"]
            
            # Be nice to LinkedIn's servers
            if i < total:
                time.sleep(2)
        
        return results
    
    def print_results(self, results: Dict[str, str]):
        """Print results in a nice format"""
        if not results:
            print("\n❌ No results found!")
            return
        
        print("\n" + "="*60)
        print("📊 RESULTS")
        print("="*60)
        print("\nCopy these lines to linkedinCompanyMapping.js:\n")
        
        for name, company_id in sorted(results.items()):
            print(f'  "{name}": "{company_id}",')
        
        print("\n" + "="*60)
        
    def save_results(self, results: Dict[str, str], filename: str = "linkedin_company_ids.json"):
        """Save results to JSON file"""
        if not results:
            return
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n💾 Results saved to: {filename}")
    
    def close(self):
        """Close the browser"""
        if self.driver:
            print("\n🏁 Closing browser...")
            self.driver.quit()


def interactive_mode(fetcher: LinkedInCompanyIDFetcher):
    """Interactive mode for manual input"""
    print("\n" + "="*60)
    print("🎯 INTERACTIVE MODE")
    print("="*60)
    
    print("\nChoose an option:")
    print("1. Enter companies manually")
    print("2. Use predefined company list")
    print("3. Select by category")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    companies = []
    
    if choice == "1":
        # Manual entry
        print("\nEnter company URLs or slugs (one per line)")
        print("Examples:")
        print("  https://www.linkedin.com/company/google/")
        print("  microsoft")
        print("  apple")
        print("\nPress Ctrl+C or enter 'done' to finish\n")
        
        while True:
            try:
                company = input("Company: ").strip()
                if not company or company.lower() == 'done':
                    break
                companies.append(company)
            except (KeyboardInterrupt, EOFError):
                print("\n")
                break
    
    elif choice == "2":
        # Use all predefined companies
        print_company_categories()
        confirm = input("Fetch IDs for ALL companies? This will take a while. (yes/no): ").strip().lower()
        if confirm == 'yes':
            companies = get_all_companies()
            print(f"\n✅ Selected {len(companies)} companies")
        else:
            print("Cancelled.")
            return
    
    elif choice == "3":
        # Select by category
        print_company_categories()
        print("Enter category names (comma-separated) or 'all':")
        selection = input("Categories: ").strip()
        
        if selection.lower() == 'all':
            companies = get_all_companies()
        else:
            for cat_name in POPULAR_COMPANIES.keys():
                if cat_name.lower() in selection.lower():
                    companies.extend(POPULAR_COMPANIES[cat_name])
        
        if companies:
            print(f"\n✅ Selected {len(companies)} companies")
        else:
            print("No companies selected!")
            return
    else:
        print("Invalid choice!")
        return
    
    if not companies:
        print("No companies entered!")
        return
    
    results = fetcher.fetch_batch(companies)
    fetcher.print_results(results)
    fetcher.save_results(results)


def main():
    parser = argparse.ArgumentParser(
        description="Fetch LinkedIn company IDs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode with menu
  python fetch_linkedin_company_ids.py

  # List all available categories
  python fetch_linkedin_company_ids.py --list-categories

  # Fetch all predefined companies (400+)
  python fetch_linkedin_company_ids.py --all

  # Fetch specific category
  python fetch_linkedin_company_ids.py --category "Tech Giants"
  python fetch_linkedin_company_ids.py --category "Indian Startups"

  # Single company
  python fetch_linkedin_company_ids.py --url https://www.linkedin.com/company/google/
  python fetch_linkedin_company_ids.py --url google

  # Batch from file
  python fetch_linkedin_company_ids.py --file companies.txt

  # Use existing Chrome browser (you must already be logged into LinkedIn)
  python fetch_linkedin_company_ids.py --existing --url google

  # Headless mode (no browser window)
  python fetch_linkedin_company_ids.py --headless --file companies.txt
        """
    )
    
    parser.add_argument(
        '--url', '-u',
        help='Single company URL or slug'
    )
    parser.add_argument(
        '--file', '-f',
        help='File containing company URLs/slugs (one per line)'
    )
    parser.add_argument(
        '--output', '-o',
        default='linkedin_company_ids.json',
        help='Output JSON file (default: linkedin_company_ids.json)'
    )
    parser.add_argument(
        '--headless',
        action='store_true',
        help='Run in headless mode (no browser window)'
    )
    parser.add_argument(
        '--existing', '-e',
        action='store_true',
        help='Use existing Chrome browser (requires Chrome started with --remote-debugging-port=9222)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Fetch all predefined companies (400+ companies)'
    )
    parser.add_argument(
        '--category', '-c',
        help='Fetch companies from specific category (e.g., "Tech Giants", "Indian Startups")'
    )
    parser.add_argument(
        '--list-categories',
        action='store_true',
        help='List all available company categories'
    )
    
    args = parser.parse_args()
    
    # Handle list categories
    if args.list_categories:
        print_company_categories()
        return
    
    # Banner
    print("\n" + "="*60)
    print("🔍 LinkedIn Company ID Fetcher")
    print("="*60 + "\n")
    
    fetcher = LinkedInCompanyIDFetcher(headless=args.headless, use_existing=args.existing)
    
    try:
        fetcher.setup_driver()
        fetcher.ensure_login()
        
        if args.all:
            # Fetch all predefined companies
            companies = get_all_companies()
            print(f"📊 Fetching {len(companies)} predefined companies\n")
            confirm = input("This will take a while. Continue? (yes/no): ").strip().lower()
            if confirm == 'yes':
                results = fetcher.fetch_batch(companies)
                fetcher.print_results(results)
                fetcher.save_results(results, args.output)
            else:
                print("Cancelled.")
        
        elif args.category:
            # Fetch by category
            companies = get_companies_by_category(args.category)
            if not companies:
                print(f"❌ Category '{args.category}' not found!")
                print("\nAvailable categories:")
                print_company_categories()
                return
            
            print(f"📊 Fetching {len(companies)} companies from '{args.category}'\n")
            results = fetcher.fetch_batch(companies)
            fetcher.print_results(results)
            fetcher.save_results(results, args.output)
        
        elif args.url:
            # Single company mode
            result = fetcher.fetch_single(args.url)
            if result:
                results = {result["name"]: result["id"]}
                fetcher.print_results(results)
                fetcher.save_results(results, args.output)
        
        elif args.file:
            # Batch mode from file
            try:
                with open(args.file, 'r') as f:
                    companies = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                
                if not companies:
                    print(f"❌ No companies found in {args.file}")
                    return
                
                print(f"📄 Loaded {len(companies)} companies from {args.file}\n")
                results = fetcher.fetch_batch(companies)
                fetcher.print_results(results)
                fetcher.save_results(results, args.output)
                
            except FileNotFoundError:
                print(f"❌ File not found: {args.file}")
        
        else:
            # Interactive mode
            interactive_mode(fetcher)
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    finally:
        fetcher.close()
        print("👋 Done!\n")


if __name__ == "__main__":
    main()
