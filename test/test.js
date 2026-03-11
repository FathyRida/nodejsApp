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

# Color codes

BOLD=”\033[1m”
RESET=”\033[0m”
CYAN=”\033[96m”
YELLOW=”\033[93m”
GREEN=”\033[92m”
WHITE=”\033[97m”
DIM=”\033[2m”
RED=”\033[91m”

print_separator() {
echo -e “${CYAN}+––––––––––––––––––––––––––––+${RESET}”
}

print_header() {
echo “”
print_separator
echo -e “${CYAN}|${BOLD}${WHITE}   Oracle Control Table Updater                       ${RESET}${CYAN}|${RESET}”
echo -e “${CYAN}|   SID: ${ORACLE_SID:-not set}${RESET}”
print_separator
echo “”
}

usage() {
echo -e “${YELLOW}Usage:${RESET}”
echo -e “  $0 <ORACLE_SID> –country <COUNTRY_CODE> [–dry-run] [–help]”
echo “”
echo -e “${YELLOW}Country codes:${RESET}”
echo -e “  ${GREEN}SWE_GP  SWE_JP  SWE_AP  SWE_BP  SWE_CP  SWE_DP  SWE_KP${RESET}”
echo “”
echo -e “${YELLOW}Options:${RESET}”
echo -e “  –dry-run    Print generated SQL without executing”
echo -e “  –help       Show this help message”
echo “”
echo -e “${DIM}CSV format expected: SCHEMA,TABLENAME,FIELDNAME,FIELDVALUE${RESET}”
echo -e “${DIM}Date values must match: DD/MM/YYYY${RESET}”
echo “”
}

# Input file resolution based on country code

get_input_file() {
local country=”$1”
case “$country” in
SWE_GP) echo “/applis/inputs/SWE_GP.csv” ;;
SWE_JP) echo “/applis/inputs/SWE_JP.csv” ;;
SWE_AP) echo “/applis/inputs/SWE_AP.csv” ;;
SWE_BP) echo “/applis/inputs/SWE_BP.csv” ;;
SWE_CP) echo “/applis/inputs/SWE_CP.csv” ;;
SWE_DP) echo “/applis/inputs/SWE_DP.csv” ;;
SWE_KP) echo “/applis/inputs/SWE_KP.csv” ;;
*)      echo “” ;;
esac
}

# Argument parsing

COUNTRY=””
DRY_RUN=false

# Shift past the first positional arg (ORACLE_SID)

shift || true

while [ $# -gt 0 ]; do
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

# Validate country

if [ -z “$COUNTRY” ]; then
echo -e “${RED}[ERROR]${RESET} –country is required.”
usage
exit 1
fi

INPUT_FILE=$(get_input_file “$COUNTRY”)

if [ -z “$INPUT_FILE” ]; then
echo -e “${RED}[ERROR]${RESET} Unknown country code: $COUNTRY”
echo -e “Valid codes: SWE_GP SWE_JP SWE_AP SWE_BP SWE_CP SWE_DP SWE_KP”
exit 1
fi

echo -e “${GREEN}[INFO]${RESET}  Country  : ${BOLD}$COUNTRY${RESET}”
echo -e “${GREEN}[INFO]${RESET}  Input    : ${BOLD}$INPUT_FILE${RESET}”
echo -e “${GREEN}[INFO]${RESET}  Dry-run  : ${BOLD}$DRY_RUN${RESET}”
echo “”

# Check input file exists

if [ ! -f “$INPUT_FILE” ]; then
echo -e “${RED}[ERROR]${RESET} Input file not found: $INPUT_FILE”
exit 1
fi

# Check ORACLE_SID is set

if [ -z “$ORACLE_SID” ]; then
echo -e “${RED}[ERROR]${RESET} ORACLE_SID is not set. Pass it as the first argument.”
exit 1
fi

# Function: get field data type from Oracle data dictionary

get_field_type() {
local schema=”$1”
local table=”$2”
local field=”$3”

sqlplus -s / as sysdba <<EOF 2>/dev/null
SET PAGESIZE 0 FEEDBACK OFF VERIFY OFF HEADING OFF ECHO OFF TRIMSPOOL ON
SELECT DATA_TYPE
FROM   DBA_TAB_COLUMNS
WHERE  OWNER       = UPPER(’${schema}’)
AND  TABLE_NAME  = UPPER(’${table}’)
AND  COLUMN_NAME = UPPER(’${field}’);
EXIT;
EOF
}

# Function: build UPDATE statement based on data type

build_update_sql() {
local schema=”$1”
local table=”$2”
local field=”$3”
local value=”$4”
local dtype=”$5”

dtype=$(echo “$dtype” | tr -d ‘[:space:]’)

local sql_value=””

case “$dtype” in
NUMBER|FLOAT|BINARY_FLOAT|BINARY_DOUBLE|INTEGER|SMALLINT|REAL)
if echo “$value” | grep -qE ‘^-?[0-9]+(.[0-9]+)?$’; then
sql_value=”$value”
else
echo -e “${RED}[WARN]${RESET}  Field $field is $dtype but value ‘$value’ is not numeric - skipping.” >&2
return 1
fi
;;
DATE)
if echo “$value” | grep -qE ‘^[0-9]{2}/[0-9]{2}/[0-9]{4}$’; then
sql_value=“TO_DATE(’${value}’,‘DD/MM/YYYY’)”
else
echo -e “${RED}[WARN]${RESET}  Field $field is DATE but value ‘$value’ does not match DD/MM/YYYY - skipping.” >&2
return 1
fi
;;
TIMESTAMP*)
if echo “$value” | grep -qE ‘^[0-9]{2}/[0-9]{2}/[0-9]{4}$’; then
sql_value=“TO_TIMESTAMP(’${value}’,‘DD/MM/YYYY’)”
else
sql_value=“TO_TIMESTAMP(’${value}’,‘DD/MM/YYYY HH24:MI:SS’)”
fi
;;
VARCHAR2|NVARCHAR2|CHAR|NCHAR|CLOB|NCLOB|LONG)
value=$(echo “$value” | sed “s/’/’’/g”)
sql_value=”’${value}’”
;;
*)
echo -e “${YELLOW}[WARN]${RESET}  Field $field has unhandled type ‘$dtype’ - treating as VARCHAR2.” >&2
value=$(echo “$value” | sed “s/’/’’/g”)
sql_value=”’${value}’”
;;
esac

echo “UPDATE ${schema}.${table} SET ${field} = ${sql_value} WHERE TP_DTW_GROUPE = ‘${COUNTRY}’;”
}

# Main processing loop

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

[ “$SCHEMA” = “SCHEMA” ] && continue
[ -z “$SCHEMA” ] && continue

# Trim carriage returns (Windows CSV)

SCHEMA=$(echo “$SCHEMA”         | tr -d ‘\r’ | xargs)
TABLENAME=$(echo “$TABLENAME”   | tr -d ‘\r’ | xargs)
FIELDNAME=$(echo “$FIELDNAME”   | tr -d ‘\r’ | xargs)
FIELDVALUE=$(echo “$FIELDVALUE” | tr -d ‘\r’ | xargs)

echo -e “${DIM}Processing: ${SCHEMA}.${TABLENAME}.${FIELDNAME} = ‘${FIELDVALUE}’${RESET}”

# Get field type from Oracle

DTYPE=$(get_field_type “$SCHEMA” “$TABLENAME” “$FIELDNAME”)

if [ -z “$DTYPE” ]; then
echo -e “${RED}  [ERROR]${RESET} Could not find column ${FIELDNAME} in ${SCHEMA}.${TABLENAME} - skipping.”
ERROR_COUNT=$(( ERROR_COUNT + 1 ))
continue
fi

echo -e “${DIM}         Type: ${YELLOW}${DTYPE}${RESET}”

# Build the SQL

SQL=$(build_update_sql “$SCHEMA” “$TABLENAME” “$FIELDNAME” “$FIELDVALUE” “$DTYPE”)
if [ $? -ne 0 ]; then
SKIP_COUNT=$(( SKIP_COUNT + 1 ))
continue
fi

echo -e “${GREEN}  [SQL]${RESET} $SQL”

if [ “$DRY_RUN” = true ]; then
echo -e “${YELLOW}  [DRY-RUN] Skipping execution.${RESET}”
SUCCESS_COUNT=$(( SUCCESS_COUNT + 1 ))
else
SQL_BATCH=”${SQL_BATCH}${SQL}
“
SUCCESS_COUNT=$(( SUCCESS_COUNT + 1 ))
fi

echo “”

done < “$INPUT_FILE”

# Execute batch if not dry-run

if [ “$DRY_RUN” = false ] && [ -n “$SQL_BATCH” ]; then
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

if [ $EXIT_CODE -eq 0 ]; then
echo -e “\n${GREEN}[SUCCESS]${RESET} Batch committed successfully.”
else
echo -e “\n${RED}[ERROR]${RESET} Batch failed (exit code $EXIT_CODE). Transaction rolled back.”
ERROR_COUNT=$(( ERROR_COUNT + SUCCESS_COUNT ))
SUCCESS_COUNT=0
fi
fi

# Summary

echo “”
print_separator
echo -e “${CYAN}  Summary${RESET}”
print_separator
echo -e “  ${GREEN}Processed / committed  : ${BOLD}${SUCCESS_COUNT}${RESET}”
echo -e “  ${YELLOW}Skipped (type mismatch): ${BOLD}${SKIP_COUNT}${RESET}”
echo -e “  ${RED}Errors (missing field) : ${BOLD}${ERROR_COUNT}${RESET}”
print_separator
echo “”


