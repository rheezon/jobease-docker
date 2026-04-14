/**
 * LinkedIn Company ID Mapping
 * 
 * This file contains mappings of company names to their LinkedIn company IDs.
 * Company IDs are more reliable than company slugs for accurate search results.
 * 
 * To find a company ID:
 * 1. Go to the company's LinkedIn page
 * 2. Look at the URL: https://www.linkedin.com/company/{slug}/
 * 3. Or inspect the page source for the company ID
 */

export const LINKEDIN_COMPANY_MAP = {
  // Tech Giants
  "google": "1441",
  "microsoft": "1035",
  "apple": "162479",
  "amazon": "1586",
  "meta": "10667",
  "facebook": "10667",
  "netflix": "165158",
  "tesla": "15564",
  
  // Indian Tech Companies
  "tcs": "1353",
  "infosys": "1283",
  "wipro": "1257",
  "hcl technologies": "1624",
  "tech mahindra": "1424",
  "cognizant": "2735",
  "accenture": "1033",
  "capgemini": "157240",
  
  // Startups & Unicorns
  "zomato": "2542487",
  "swiggy": "5214778",
  "paytm": "2748049",
  "ola": "2795476",
  "flipkart": "1018780",
  "byju's": "3725311",
  "phonepe": "9414679",
  "razorpay": "9206314",
  "cred": "18700236",
  "meesho": "10194014",
  "zerodha": "2932020",
  "dunzo": "10382192",
  "urban company": "5136708",
  "freshworks": "367127",
  "zoho": "36064",
  "postman": "11471011",
  
  // Fintech
  "branch international": "9373882",
  "branch": "9373882",
  "revolut": "2932397",
  "stripe": "2135371",
  "square": "221258",
  "paypal": "1467",
  "visa": "1519",
  "mastercard": "1529",
  
  // E-commerce
  "amazon india": "1586",
  "myntra": "1449241",
  "ajio": "9219838",
  "nykaa": "2767259",
  "bigbasket": "1076738",
  
  // Consulting
  "mckinsey": "1073",
  "bcg": "3879",
  "boston consulting group": "3879",
  "bain": "3752",
  "deloitte": "1038",
  "ey": "1073",
  "pwc": "1054",
  "kpmg": "1081",
  
  // Banks & Financial Services
  "goldman sachs": "1449",
  "jpmorgan": "1067",
  "jp morgan": "1067",
  "morgan stanley": "1418",
  "citibank": "1043",
  "hsbc": "1069",
  "hdfc bank": "578738",
  "icici bank": "163482",
  "axis bank": "163070",
  "kotak mahindra bank": "163476",
  
  // Other Tech
  "salesforce": "2453",
  "oracle": "1028",
  "sap": "1115",
  "adobe": "1283",
  "atlassian": "5115",
  "slack": "2136531",
  "uber": "1815218",
  "airbnb": "2251104",
  "spotify": "2618986",
  "twitter": "96622",
  "x": "96622",
  "linkedin": "1337",
  "snapchat": "2645222",
  "pinterest": "1506023",
  "reddit": "1933",
  "dropbox": "5115",
  
  // Cloud & Infrastructure
  "aws": "2382910",
  "amazon web services": "2382910",
  "gcp": "1441",
  "google cloud": "1441",
  "azure": "1035",
  "ibm": "1009",
  "vmware": "1043",
  
  // Automotive
  "ford": "1093",
  "gm": "1088",
  "general motors": "1088",
  "toyota": "1088",
  "bmw": "1079",
  "mercedes": "1024",
  
  // Retail
  "walmart": "1073",
  "target": "1038",
  "costco": "1050",
  "ikea": "1075",
  
  // Media & Entertainment
  "disney": "1292",
  "warner bros": "1368",
  "sony": "1094",
  "paramount": "4423",
};

/**
 * Normalize company name for matching
 * @param {string} name - Company name to normalize
 * @returns {string} - Normalized company name
 */
export function normalizeCompanyName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s+(inc\.?|ltd\.?|llc\.?|pvt\.?|limited|corporation|corp\.?|company|co\.?)$/i, '')
    // Remove special characters but keep spaces and hyphens
    .replace(/[^\w\s-]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find LinkedIn company ID for a given company name
 * Uses multiple matching strategies:
 * 1. Exact match (normalized)
 * 2. Partial match (contains)
 * 3. Word-based match
 * 
 * @param {string} companyName - Company name to look up
 * @returns {string|null} - LinkedIn company ID or null if not found
 */
export function getLinkedInCompanyId(companyName) {
  if (!companyName) return null;
  
  const normalized = normalizeCompanyName(companyName);
  
  // Strategy 1: Exact match
  if (LINKEDIN_COMPANY_MAP[normalized]) {
    return LINKEDIN_COMPANY_MAP[normalized];
  }
  
  // Strategy 2: Try without common words
  const withoutCommon = normalized
    .replace(/\s+(the|group|global|india|international|technologies|technology|tech|solutions|services|systems)\s*/gi, ' ')
    .trim();
  
  if (withoutCommon && LINKEDIN_COMPANY_MAP[withoutCommon]) {
    return LINKEDIN_COMPANY_MAP[withoutCommon];
  }
  
  // Strategy 3: Find partial match (company name contains or is contained in mapping)
  for (const [key, id] of Object.entries(LINKEDIN_COMPANY_MAP)) {
    // If our normalized name contains the key
    if (normalized.includes(key)) {
      return id;
    }
    // If the key contains our normalized name
    if (key.includes(normalized) && normalized.length > 3) {
      return id;
    }
  }
  
  // Strategy 4: Word-based matching (match any significant word)
  const words = normalized.split(/\s+/).filter(word => word.length > 3);
  for (const word of words) {
    for (const [key, id] of Object.entries(LINKEDIN_COMPANY_MAP)) {
      const keyWords = key.split(/\s+/);
      if (keyWords.includes(word)) {
        return id;
      }
    }
  }
  
  return null;
}

/**
 * Generate LinkedIn search URL for company connections
 * @param {string} companyName - Company name
 * @returns {string} - LinkedIn search URL
 */
export function generateLinkedInReferralUrl(companyName) {
  // Generate a LinkedIn company people page URL
  // Format: linkedin.com/company/{slug}/people/
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `https://www.linkedin.com/company/${slug}/people/`;
}

