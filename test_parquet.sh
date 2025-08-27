#!/usr/bin/env bash
# count_parquet_rows.sh — count rows in Parquet files (macOS Bash 3.2 compatible)
# Usage:
#   bash count_parquet_rows.sh [-r] [-T duckdb|parquet-tools] [DIR]
# Options:
#   -r  Recurse into subdirectories
#   -T  Tool to use (default: auto-detect). Choices: duckdb | parquet-tools
#   DIR Directory to scan (default: current directory)
#
# Dependencies (either works):
#   - duckdb CLI  → brew install duckdb
#   - parquet-tools → brew install parquet-tools   (Apache Parquet tools)

set -euo pipefail

RECURSE=0
TOOL="auto"
while getopts ":rT:h" opt; do
  case "$opt" in
    r) RECURSE=1 ;;
    T) TOOL="$OPTARG" ;;
    h)
      grep -E "^# " "$0" | sed 's/^# //'
      exit 0
      ;;
    \?) echo "Unknown option: -$OPTARG" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

DIR="${1:-.}"
LC_ALL=C
TOTAL=0

# Pick a tool if auto
if [[ "$TOOL" == "auto" ]]; then
  if command -v duckdb >/dev/null 2>&1; then
    TOOL="duckdb"
  elif command -v parquet-tools >/dev/null 2>&1; then
    TOOL="parquet-tools"
  else
    echo "No supported tool found."
    echo "Install one of:"
    echo "  brew install duckdb"
    echo "  brew install parquet-tools"
    exit 1
  fi
fi

count_one() {
  local f="$1"
  local n
  case "$TOOL" in
    duckdb)
      # Escape single quotes for SQL literal
      local fp=${f//\'/\'\'}
      # -csv gives two lines; we take the last one
      n=$(duckdb -csv -c "select count(*) from read_parquet('$fp');" 2>/dev/null | tail -n 1)
      ;;
    parquet-tools)
      # Handles outputs like "row count: N" or just "N"
      n=$(parquet-tools rowcount "$f" 2>/dev/null | awk 'NF{print $NF}' | tail -n 1)
      ;;
    *)
      echo "Unknown tool: $TOOL" >&2; exit 3
      ;;
  esac

  # Validate numeric
  if ! printf '%s' "$n" | grep -Eq '^[0-9]+$'; then
    echo "Failed to count rows for: $f" >&2
    return
  fi

  printf "%12d  %s\n" "$n" "$f"
  TOTAL=$((TOTAL + n))
}

printf "%12s  %s\n" "ROWS" "FILE"
printf "%12s  %s\n" "------------" "----"

if [[ "$RECURSE" -eq 1 ]]; then
  found=0
  # Use -print0 to handle spaces/newlines in filenames
  while IFS= read -r -d '' f; do
    [[ -f "$f" ]] || continue
    found=1
    count_one "$f"
  done < <(find "$DIR" -type f \( -iname '*.parquet' \) -print0)

  if [[ "$found" -eq 0 ]]; then
    echo "No Parquet files found in: $DIR"
    exit 0
  fi
else
  found=0
  for f in "$DIR"/*.parquet "$DIR"/*.PARQUET; do
    [[ -f "$f" ]] || continue
    found=1
    count_one "$f"
  done
  if [[ "$found" -eq 0 ]]; then
    echo "No Parquet files found in: $DIR"
    exit 0
  fi
fi

printf "%12s  %s\n" "------------" "----"
printf "%12d  %s\n" "$TOTAL" "TOTAL"
