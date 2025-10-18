#!/usr/bin/env bash
# test_csv_count.sh — count lines in CSV files (works on macOS Bash 3.2)
# Usage:
#   bash test_csv_count.sh [-r] [-H] [DIR]
#   -r  Recurse into subdirectories
#   -H  Exclude one header row per file (if present)
#   DIR Directory to scan (default: current directory)

set -euo pipefail

RECURSE=0
EXCL_HEADER=0
while getopts ":rHh" opt; do
  case "$opt" in
    r) RECURSE=1 ;;
    H) EXCL_HEADER=1 ;;
    h)
      echo "Usage: bash test_csv_count.sh [-r] [-H] [DIR]"
      exit 0
      ;;
    \?) echo "Unknown option: -$OPTARG" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

DIR="${1:-.}"
LC_ALL=C
TOTAL=0

count_one() {
  local f="$1"
  local n
  if [[ "$f" == *.gz ]]; then
    n=$(gzip -cd -- "$f" | awk 'END{print NR}')
  else
    n=$(awk 'END{print NR}' "$f")
  fi
  if [[ "$EXCL_HEADER" -eq 1 && "$n" -gt 0 ]]; then
    n=$((n-1))
  fi
  printf "%12d  %s\n" "$n" "$f"
  TOTAL=$((TOTAL + n))
}

printf "%12s  %s\n" "ROWS" "FILE"
printf "%12s  %s\n" "------------" "----"

if [[ "$RECURSE" -eq 1 ]]; then
  # Use process substitution to avoid a subshell, so TOTAL updates persist in Bash 3.2
  count=0
  while IFS= read -r -d '' f; do
    [[ -f "$f" ]] || continue
    count_one "$f"
    count=$((count+1))
  done < <(find "$DIR" -type f \( -iname '*.csv' -o -iname '*.csv.gz' \) -print0)

  if [[ "$count" -eq 0 ]]; then
    echo "No CSV files found in: $DIR"
    exit 0
  fi
else
  found=0
  for f in "$DIR"/*.csv "$DIR"/*.CSV "$DIR"/*.csv.gz "$DIR"/*.CSV.GZ; do
    [[ -f "$f" ]] || continue
    found=1
    count_one "$f"
  done
  if [[ "$found" -eq 0 ]]; then
    echo "No CSV files found in: $DIR"
    exit 0
  fi
fi

printf "%12s  %s\n" "------------" "----"
printf "%12d  %s\n" "$TOTAL" "TOTAL"
