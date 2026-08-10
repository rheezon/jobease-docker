#!/usr/bin/env python3
"""
Quick script to merge prepopulated IDs into your mapping file
"""

import json

# Load prepopulated data
with open('linkedin_company_ids_prepopulated.json', 'r') as f:
    company_ids = json.load(f)

# Generate JavaScript mapping format
print("// Add these to your linkedinCompanyMapping.js:\n")
print("export const LINKEDIN_COMPANY_MAP = {")

for company, company_id in sorted(company_ids.items()):
    print(f'  "{company}": "{company_id}",')

print("};")

print(f"\n// Total: {len(company_ids)} companies")
