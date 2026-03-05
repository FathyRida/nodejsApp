#!/bin/bash

export ORACLE_SID=P11436DP10
export ORACLE_HOME=”/apps/oracle/19000/250715/rdb/std”
export PATH=$ORACLE_HOME/bin:$PATH

lisa_query_result=”/tmp/lisa_query_result.txt”
feedvisir_rquery_result=”/tmp/feedvisir_rquery_result.txt”

set -e

# ─────────────────────────────────────────────

# QUERY 1 — WAREHOUSE.TP_DWH_MC_LISA

# ─────────────────────────────────────────────

sqlplus -s / as sysdba <<EOF > “$lisa_query_result”
set pagesize 100
set linesize 200
set feedback off
set heading off
set colsep ‘|’
SELECT
country,
to_char(last_recieved_file,‘hh24:mi’) as last_recieved_file,
to_char(batch_end,‘hh24:mi’) as batch_end
FROM
WAREHOUSE.TP_dwh_mc_lisa
WHERE
loading_date like current_date
order by country;
exit
EOF

echo “First Query executed, result saved in $lisa_query_result”

# ─────────────────────────────────────────────

# QUERY 2 — WAREHOUSE.TP_DWH_MC_FEEDVISIR

# ─────────────────────────────────────────────

sqlplus -s / as sysdba <<EOF > “$feedvisir_rquery_result”
set pagesize 100
set linesize 200
set feedback off
set heading off
set colsep ‘|’
SELECT
country,
to_char(last_recieved_file,‘DD/MM/YYYY’) as last_recieved_file,
to_char(last_generated_xml,‘DD/MM/YYYY’) as last_generated_xml
FROM
WAREHOUSE.tp_dwh_mc_feedvisir
WHERE
loading_date like current_date;
exit
EOF

echo “Query executed, result saved in $feedvisir_rquery_result”

# ─────────────────────────────────────────────

# DISPLAY — Formatted Tables in Terminal

# ─────────────────────────────────────────────

# Colors & styles

BOLD=”\033[1m”
RESET=”\033[0m”
CYAN=”\033[96m”
YELLOW=”\033[93m”
GREEN=”\033[92m”
WHITE=”\033[97m”
DIM=”\033[2m”
BG_DARK=”\033[48;5;235m”

print_separator_lisa() {
echo -e “${CYAN}+———––+––––––––––+————+${RESET}”
}

print_separator_feedvisir() {
echo -e “${YELLOW}+———+––––––––––+––––––––––+${RESET}”
}

echo “”
echo -e “${BG_DARK}${BOLD}${CYAN}  ╔══════════════════════════════════════════════╗  ${RESET}”
echo -e “${BG_DARK}${BOLD}${CYAN}  ║        ORACLE WAREHOUSE MONITOR              ║  ${RESET}”
echo -e “${BG_DARK}${BOLD}${CYAN}  ║        $(date ‘+%d/%m/%Y %H:%M:%S’)                      ║  ${RESET}”
echo -e “${BG_DARK}${BOLD}${CYAN}  ╚══════════════════════════════════════════════╝  ${RESET}”
echo “”

# ── TABLE 1: LISA ──────────────────────────────

echo -e “${BOLD}${CYAN}  ► LISA — TP_DWH_MC_LISA${RESET}”
echo “”
print_separator_lisa
echo -e “${CYAN}|${RESET} ${BOLD}${WHITE}Country    ${RESET} ${CYAN}|${RESET} ${BOLD}${WHITE}Last Received File  ${RESET}${CYAN}|${RESET} ${BOLD}${WHITE}Batch End  ${RESET} ${CYAN}|${RESET}”
print_separator_lisa

while IFS=’|’ read -r country last_recv batch_end; do
# Trim whitespace
country=$(echo “$country” | xargs)
last_recv=$(echo “$last_recv” | xargs)
batch_end=$(echo “$batch_end” | xargs)

```
# Skip empty lines
[ -z "$country" ] && continue

printf "${CYAN}|${RESET} ${GREEN}%-11s${RESET} ${CYAN}|${RESET} %-20s ${CYAN}|${RESET} %-10s ${CYAN}|${RESET}\n" \
    "$country" "$last_recv" "$batch_end"
```

done < “$lisa_query_result”

print_separator_lisa
echo “”

# ── TABLE 2: FEEDVISIR ────────────────────────

echo -e “${BOLD}${YELLOW}  ► FEEDVISIR — TP_DWH_MC_FEEDVISIR${RESET}”
echo “”
print_separator_feedvisir
echo -e “${YELLOW}|${RESET} ${BOLD}${WHITE}Country  ${RESET} ${YELLOW}|${RESET} ${BOLD}${WHITE}Last Received File  ${RESET}${YELLOW}|${RESET} ${BOLD}${WHITE}Last Generated XML  ${RESET}${YELLOW}|${RESET}”
print_separator_feedvisir

while IFS=’|’ read -r country last_recv last_xml; do
country=$(echo “$country” | xargs)
last_recv=$(echo “$last_recv” | xargs)
last_xml=$(echo “$last_xml” | xargs)

```
[ -z "$country" ] && continue

printf "${YELLOW}|${RESET} ${GREEN}%-9s${RESET} ${YELLOW}|${RESET} %-20s ${YELLOW}|${RESET} %-20s ${YELLOW}|${RESET}\n" \
    "$country" "$last_recv" "$last_xml"
```

done < “$feedvisir_rquery_result”

print_separator_feedvisir
echo “”
echo -e “${DIM}  SID: $ORACLE_SID  |  Run: $(date ‘+%d-%b-%Y %H:%M’)${RESET}”
echo “”