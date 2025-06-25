# Fix for EFBIG Error in tr-cron-pull-identifiers Command

## Problem
The customer was experiencing an `EFBIG: file too large, write` error when using the `tr-cron-pull-identifiers` command. This error occurred after successfully pulling 1,377,648 identifiers from 459,216 requests and attempting to write them all to a single CSV file.

The error message:
```
[Error: EFBIG: file too large, write] {
  errno: -27,
  code: 'EFBIG',
  syscall: 'write'
}
```

This error occurs when a file exceeds the file system's maximum file size limit.

## Solution
Modified the CLI command to automatically split large datasets into multiple smaller CSV files to avoid hitting file system size limits.

### Changes Made

#### 1. Enhanced `writeCsv.ts` (src/cron/writeCsv.ts)
- Added new `writeLargeCsv()` function that automatically splits large datasets into multiple files
- Uses configurable chunk size (default: 100,000 rows per file)
- Creates numbered files with clear naming pattern: `filename_part01_of_05.csv`
- Falls back to single file for small datasets

#### 2. Updated CLI Command (src/cli-cron-pull-identifiers.ts)
- Added new `--chunkSize` parameter (default: 100,000)
- Replaced `writeCsv()` with `writeLargeCsv()` 
- Added validation for chunk size parameter
- Enhanced logging to show multiple files when splitting occurs
- Updated documentation with chunk size parameter

### Usage

The command now supports an optional `--chunkSize` parameter:

```bash
tr-cron-pull-identifiers --auth=$TRANSCEND_API_KEY \
  --dataSiloId=8fa0e2f9-be00-4a68-b31c-52a2f7091ae4 \
  --actions=ERASURE \
  --file=./ryan.csv \
  --pageLimit=5000 \
  --chunkSize=100000
```

### Behavior

**For small datasets (≤ chunk size):**
- Creates single file as before
- Output: `Successfully wrote 50000 identifiers to file "./ryan.csv"`

**For large datasets (> chunk size):**
- Automatically splits into multiple files
- Example with 1,377,648 identifiers and 100,000 chunk size:
  - `ryan_part01_of_14.csv` (100,000 rows)
  - `ryan_part02_of_14.csv` (100,000 rows)
  - ...
  - `ryan_part14_of_14.csv` (77,648 rows)
- Output: 
  ```
  Successfully wrote 1377648 identifiers to 14 files:
    - ryan_part01_of_14.csv
    - ryan_part02_of_14.csv
    - ...
  ```

### Benefits
1. **Fixes EFBIG error**: No single file exceeds system limits
2. **Configurable**: Users can adjust chunk size based on their needs
3. **Backward compatible**: Works with existing commands (uses sensible defaults)
4. **Clear naming**: Generated files have intuitive, sorted names
5. **Informative logging**: Users know exactly what files were created

### Files Modified
- `src/cron/writeCsv.ts` - Added `writeLargeCsv()` function
- `src/cli-cron-pull-identifiers.ts` - Updated to use new function and added chunk size parameter