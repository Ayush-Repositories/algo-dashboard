#!/bin/bash
set -e

# This script runs inside the postgres container on first init.
# It reads /seed-data/data.csv and inserts users into the database.

CSV_FILE="/seed-data/data.csv"

if [ ! -f "$CSV_FILE" ]; then
  echo "No seed CSV found at $CSV_FILE, skipping seed."
  exit 0
fi

echo "Seeding users from $CSV_FILE..."

# Skip header line, read CSV
tail -n +2 "$CSV_FILE" | while IFS=',' read -r name roll_no email mobile leetcode codeforces codechef rest; do
  # Trim whitespace
  name=$(echo "$name" | xargs)
  roll_no=$(echo "$roll_no" | xargs)
  # Take first handle if comma-separated (handles with commas are quoted in CSV)
  leetcode=$(echo "$leetcode" | sed 's/^"//' | sed 's/"$//' | cut -d',' -f1 | xargs)
  codeforces=$(echo "$codeforces" | xargs)
  codechef=$(echo "$codechef" | xargs)

  # Skip empty names
  [ -z "$name" ] && continue

  # Convert empty strings to NULL
  [ -z "$roll_no" ] && roll_no_val="NULL" || roll_no_val="'$(echo "$roll_no" | sed "s/'/''/g")'"
  [ -z "$leetcode" ] && lc_val="NULL" || lc_val="'$(echo "$leetcode" | sed "s/'/''/g")'"
  [ -z "$codeforces" ] && cf_val="NULL" || cf_val="'$(echo "$codeforces" | sed "s/'/''/g")'"
  [ -z "$codechef" ] && cc_val="NULL" || cc_val="'$(echo "$codechef" | sed "s/'/''/g")'"

  psql -v ON_ERROR_STOP=0 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
    "INSERT INTO users (name, roll_no, leetcode_handle, codeforces_handle, codechef_handle)
     VALUES ('$(echo "$name" | sed "s/'/''/g")', $roll_no_val, $lc_val, $cf_val, $cc_val)
     ON CONFLICT (roll_no) DO UPDATE SET
       name = EXCLUDED.name,
       leetcode_handle = EXCLUDED.leetcode_handle,
       codeforces_handle = EXCLUDED.codeforces_handle,
       codechef_handle = EXCLUDED.codechef_handle;" 2>/dev/null
done

COUNT=$(psql -t -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM users;" | xargs)
echo "Seeded $COUNT users from data.csv"
