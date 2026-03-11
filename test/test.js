const request = require('supertest');
const assert = require('assert');
const app = require('../index'); // Import the Express app

describe('GET /', () => {
  it('should return "Hello, My World!"', (done) => {
    request(app)
      .get('/')
      .expect(200)
      .end((err, res) => {
        assert.strictEqual(res.text, 'Hello, My World!');
        done(err);
      });
  });
});



#!/bin/bash

export ORACLE_SID=${1}
export ORACLE_HOME=”/apps/oracle/19000/250715/rdb/std”
export PATH=$ORACLE_HOME/bin:$PATH

# ─── Color palette ────────────────────────────────────────────────────────────

BOLD=”\033[1m”
RESET=”\033[0m”
CYAN=”\033[96m”
YELLOW=”\033[93m”
GREEN=”\033[92m”
WHITE=”\033[97m”
DIM=”\033[2m”
RED=”\033[91m”
BG_DARK=”\033[48;5;235m”

print_separator() {
echo -e “${CYAN}+––––––––––––––––––––––––––––+${RESET}”
}

print_header() {
echo “”
print_separator
echo -e “${CYAN}|${BOLD}${WHITE}   Oracle Control Table Updater                         ${RESET}${CYAN}|${RESET}”
echo -e “${CYAN}|${DIM}   SID: ${ORACLE_SID:-<not set>}                                        ${RESET}${CYAN}|${RESET}”
print_separator
echo “”
}

usage() {
echo -e “${YELLOW}Usage:${RESET}”
echo -e “  $0 <ORACLE_SID> –country <COUNTRY_CODE> [–dry-run] [–help]”
echo “”
echo -e “${YELLOW}Country codes:${RESET}”
echo -e “  ${GREEN}SWE_GP${RESET}  ${GREEN}SWE_JP${RESET}  ${GREEN}SWE_AP${RESET}  ${GREEN}SWE_BP${RESET}  ${GREEN}SWE_CP${RESET}  ${GREEN}SWE_DP${RESET}  ${GREEN}SWE_KP${RESET}”
echo “”
echo -e “${YELLOW}Options:${RESET}”
echo -e “  –dry-run    Print generated SQL without executing”
echo -e “  –help       Show this help message”
echo “”
echo -e “${DIM}CSV format expected: SCHEMA,TABLENAME,FIELDNAME,FIELDVALUE${RESET}”
echo -e “${DIM}Date values must match: DD/MM/YYYY${RESET}”
echo “”
}

# ─── Input file map ───────────────────────────────────────────────────────────

declare -A FILE_MAP
FILE_MAP[“SWE_GP”]=”/applis/inputs/SWE_GP.csv”
FILE_MAP[“SWE_JP”]=”/applis/inputs/SWE_JP.csv”
FILE_MAP[“SWE_AP”]=”/applis/inputs/SWE_AP.csv”
FILE_MAP[“SWE_BP”]=”/applis/inputs/SWE_BP.csv”
FILE_MAP[“SWE_CP”]=”/applis/inputs/SWE_CP.csv”
FILE_MAP[“SWE_DP”]=”/applis/inputs/SWE_DP.csv”
FILE_MAP[“SWE_KP”]=”/applis/inputs/SWE_KP.csv”

# ─── Argument parsing ─────────────────────────────────────────────────────────

COUNTRY=””
DRY_RUN=false

# First positional arg is ORACLE_SID (already exported above), shift past it

shift || true

while [[ $# -gt 0 ]]; do
case “$1” in
–country)
COUNTRY=$(echo “$2” | tr ‘[:lower:]’ ‘[:upper:]’)
shift 2
;;
–dry-run)
DRY_RUN=true
shift
;;
–help|-h)
print_header
usage
exit 0
;;
*)
echo -e “${RED}[ERROR]${RESET} Unknown option: $1”
usage
exit 1
;;
esac
done

print_header

# ─── Validate country ─────────────────────────────────────────────────────────

if [[ -z “$COUNTRY” ]]; then
echo -e “${RED}[ERROR]${RESET} –country is required.\n”
usage
exit 1
fi

if [[ -z “${FILE_MAP[$COUNTRY]+_}” ]]; then
echo -e “${RED}[ERROR]${RESET} Unknown country code: ${BOLD}$COUNTRY${RESET}”
echo -e “Valid codes: ${!FILE_MAP[*]}”
exit 1
fi

INPUT_FILE=”${FILE_MAP[$COUNTRY]}”
echo -e “${GREEN}[INFO]${RESET}  Country  : ${BOLD}$COUNTRY${RESET}”
echo -e “${GREEN}[INFO]${RESET}  Input    : ${BOLD}$INPUT_FILE${RESET}”
echo -e “${GREEN}[INFO]${RESET}  Dry-run  : ${BOLD}$DRY_RUN${RESET}”
echo “”

# ─── Check input file exists ──────────────────────────────────────────────────

if [[ ! -f “$INPUT_FILE” ]]; then
echo -e “${RED}[ERROR]${RESET} Input file not found: $INPUT_FILE”
exit 1
fi

# ─── Oracle connectivity check ────────────────────────────────────────────────

if [[ -z “$ORACLE_SID” ]]; then
echo -e “${RED}[ERROR]${RESET} ORACLE_SID is not set. Pass it as the first argument.”
exit 1
fi

# ─── Function: get field data type from Oracle data dictionary ────────────────

get_field_type() {
local schema=”$1”
local table=”$2”
local field=”$3”

sqlplus -s / as sysdba <<EOF 2>/dev/null
SET PAGESIZE 0 FEEDBACK OFF VERIFY OFF HEADING OFF ECHO OFF TRIMSPOOL ON
SELECT DATA_TYPE
FROM   DBA_TAB_COLUMNS
WHERE  OWNER      = UPPER(’${schema}’)
AND  TABLE_NAME = UPPER(’${table}’)
AND  COLUMN_NAME= UPPER(’${field}’);
EXIT;
EOF
}

# ─── Function: build UPDATE statement based on data type ─────────────────────

build_update_sql() {
local schema=”$1”
local table=”$2”
local field=”$3”
local value=”$4”
local dtype=”$5”

# Trim whitespace from dtype

dtype=$(echo “$dtype” | tr -d ‘[:space:]’)

local sql_value=””

case “$dtype” in
# ── Numeric types ─────────────────────────────────────────────────────
NUMBER|FLOAT|BINARY_FLOAT|BINARY_DOUBLE|INTEGER|SMALLINT|REAL)
# Validate it really looks numeric
if [[ “$value” =~ ^-?[0-9]+(.[0-9]+)?$ ]]; then
sql_value=”$value”
else
echo -e “${RED}[WARN]${RESET}  Field ${BOLD}$field${RESET} is $dtype but value ‘${value}’ is not numeric — skipping.” >&2
return 1
fi
;;

```
# ── Date type ─────────────────────────────────────────────────────────
DATE)
  # Expect DD/MM/YYYY; convert to TO_DATE call
  if [[ "$value" =~ ^[0-9]{2}/[0-9]{2}/[0-9]{4}$ ]]; then
    sql_value="TO_DATE('${value}','DD/MM/YYYY')"
  else
    echo -e "${RED}[WARN]${RESET}  Field ${BOLD}$field${RESET} is DATE but value '${value}' doesn't match DD/MM/YYYY — skipping." >&2
    return 1
  fi
  ;;

# ── Timestamp types ───────────────────────────────────────────────────
TIMESTAMP*|"TIMESTAMP WITH TIME ZONE"|"TIMESTAMP WITH LOCAL TIME ZONE")
  if [[ "$value" =~ ^[0-9]{2}/[0-9]{2}/[0-9]{4}$ ]]; then
    sql_value="TO_TIMESTAMP('${value}','DD/MM/YYYY')"
  else
    sql_value="TO_TIMESTAMP('${value}','DD/MM/YYYY HH24:MI:SS')"
  fi
  ;;

# ── Character / CLOB types ────────────────────────────────────────────
VARCHAR2|NVARCHAR2|CHAR|NCHAR|CLOB|NCLOB|LONG)
  # Escape single quotes in the value
  value="${value//\'/\'\'}"
  sql_value="'${value}'"
  ;;

# ── Unknown / unhandled ───────────────────────────────────────────────
*)
  echo -e "${YELLOW}[WARN]${RESET}  Field ${BOLD}$field${RESET} has unhandled type '${dtype}' — treating as VARCHAR2." >&2
  value="${value//\'/\'\'}"
  sql_value="'${value}'"
  ;;
```

esac

echo “UPDATE ${schema}.${table} SET ${field} = ${sql_value} WHERE TP_DTW_GROUPE = ‘${COUNTRY}’;”
}

# ─── Main processing loop ─────────────────────────────────────────────────────

print_separator
echo -e “${CYAN}  Processing rows from: ${BOLD}$INPUT_FILE${RESET}”
print_separator
echo “”

SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0
SQL_BATCH=””

while IFS=’,’ read -r SCHEMA TABLENAME FIELDNAME FIELDVALUE; do

# Skip header line or empty lines

[[ “$SCHEMA” == “SCHEMA” || -z “$SCHEMA” ]] && continue

# Trim any carriage returns (Windows CSV)

SCHEMA=$(echo “$SCHEMA”     | tr -d ‘\r’ | xargs)
TABLENAME=$(echo “$TABLENAME” | tr -d ‘\r’ | xargs)
FIELDNAME=$(echo “$FIELDNAME” | tr -d ‘\r’ | xargs)
FIELDVALUE=$(echo “$FIELDVALUE” | tr -d ‘\r’ | xargs)

echo -e “${DIM}Processing: ${SCHEMA}.${TABLENAME}.${FIELDNAME} = ‘${FIELDVALUE}’${RESET}”

# Get field type from Oracle

DTYPE=$(get_field_type “$SCHEMA” “$TABLENAME” “$FIELDNAME”)

if [[ -z “$DTYPE” ]]; then
echo -e “${RED}  [ERROR]${RESET} Could not find column ${BOLD}${FIELDNAME}${RESET} in ${SCHEMA}.${TABLENAME} — skipping.”
(( ERROR_COUNT++ ))
continue
fi

echo -e “${DIM}         Type: ${YELLOW}${DTYPE}${RESET}”

# Build the SQL

SQL=$(build_update_sql “$SCHEMA” “$TABLENAME” “$FIELDNAME” “$FIELDVALUE” “$DTYPE”)
if [[ $? -ne 0 ]]; then
(( SKIP_COUNT++ ))
continue
fi

echo -e “${GREEN}  [SQL]${RESET} $SQL”

if [[ “$DRY_RUN” == true ]]; then
echo -e “${YELLOW}  [DRY-RUN] Skipping execution.${RESET}”
(( SUCCESS_COUNT++ ))
else
# Accumulate into batch
SQL_BATCH+=”${SQL}”$’\n’
(( SUCCESS_COUNT++ ))
fi

echo “”

done < “$INPUT_FILE”

# ─── Execute batch if not dry-run ─────────────────────────────────────────────

if [[ “$DRY_RUN” == false && -n “$SQL_BATCH” ]]; then
echo “”
print_separator
echo -e “${CYAN}  Executing batch in Oracle…${RESET}”
print_separator

RESULT=$(sqlplus -s / as sysdba <<EOF
SET FEEDBACK ON
SET ECHO OFF
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
${SQL_BATCH}
COMMIT;
EXIT;
EOF
)

EXIT_CODE=$?
echo “$RESULT”

if [[ $EXIT_CODE -eq 0 ]]; then
echo -e “\n${GREEN}[SUCCESS]${RESET} Batch committed successfully.”
else
echo -e “\n${RED}[ERROR]${RESET} Batch failed (exit code $EXIT_CODE). Transaction rolled back.”
ERROR_COUNT=$(( ERROR_COUNT + SUCCESS_COUNT ))
SUCCESS_COUNT=0
fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────

echo “”
print_separator
echo -e “${CYAN}  Summary${RESET}”
print_separator
echo -e “  ${GREEN}Processed / committed : ${BOLD}${SUCCESS_COUNT}${RESET}”
echo -e “  ${YELLOW}Skipped (type mismatch): ${BOLD}${SKIP_COUNT}${RESET}”
echo -e “  ${RED}Errors (missing field) : ${BOLD}${ERROR_COUNT}${RESET}”
print_separator
echo “”

