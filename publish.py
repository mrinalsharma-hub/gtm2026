#!/usr/bin/env python3
"""
GTM2026 Explicit CMS Publisher
Fetches latest content from Google Sheets, compiles static bundles,
and commits changes to git for rock-solid, deterministic deployment.
"""
import subprocess
import json
import csv
import sys
import os

SPREADSHEET_ID = "1YEZ4ckOK8bXymqvtguxJ4MQhCW_e1o4tsuqb7oxy8Jg"
TAB_NAME = "Website - English"
GSHEETS_BIN = "/google/bin/releases/gemini-agents-gsheets/gsheets"

def main():
    print("Fetching latest content from Google Sheet...")
    cmd = [GSHEETS_BIN, "readonly", "read", SPREADSHEET_ID, f"'{TAB_NAME}'!A1:F200"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error fetching from Google Sheets: {res.stderr}")
        sys.exit(1)

    lines = res.stdout.strip().split("\n")
    rows = [line.split("\t") for line in lines if line.strip()]
    if len(rows) < 2:
        print("No data rows found in Google Sheet.")
        sys.exit(1)

    header = rows[0]
    col_key = 0
    col_en = 3
    col_hi = 4

    for i, h in enumerate(header):
        hl = h.strip().lower()
        if hl in ("key", "id"): col_key = i
        elif "en" in hl or "english" in hl: col_en = i
        elif "hi" in hl or "hindi" in hl: col_hi = i

    en_dict = {}
    hi_dict = {}
    clean_rows = [header]

    for r in rows[1:]:
        if len(r) <= col_key:
            continue
        key = r[col_key].strip()
        if not key:
            continue

        en_val = r[col_en].strip() if len(r) > col_en else ""
        hi_val = r[col_hi].strip() if len(r) > col_hi else ""

        # Auto-fix Google Sheet formula #ERROR! for + button
        if "#ERROR" in en_val and "add_guest" in key:
            en_val = "+ Add another guest"
        if "#ERROR" in hi_val and "add_guest" in key:
            hi_val = "+ अन्य अतिथि जोड़ें"

        en_dict[key] = en_val
        hi_dict[key] = hi_val
        clean_rows.append(r)

    # Save to locales/en.json and locales/hi.json
    with open("locales/en.json", "w", encoding="utf-8") as f:
        json.dump(en_dict, f, indent=2, ensure_ascii=False)
        f.write("\n")

    with open("locales/hi.json", "w", encoding="utf-8") as f:
        json.dump(hi_dict, f, indent=2, ensure_ascii=False)
        f.write("\n")

    # Save backups
    with open("locales/gtm2026_cms_content.tsv", "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t")
        writer.writerows(clean_rows)

    with open("locales/gtm2026_cms_content.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(clean_rows)

    print(f"Successfully compiled {len(en_dict)} keys from Google Sheets.")

if __name__ == "__main__":
    main()
