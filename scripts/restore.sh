#!/usr/bin/env bash
# ==============================================================
# Coffee Shop Order Management System (Akufada)
# Database Restore & Verification Script (Bash / POSIX)
# ==============================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: ./scripts/restore.sh <path_to_dump_file> [target_database]"
  exit 1
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
RESTORE_TARGET_DB="${2:-akufada_restore_test}"
DB_USER="${POSTGRES_USER:-akufada_admin}"

echo "=========================================="
echo "AKUFADA VERIFIED RESTORATION RUNBOOK"
echo "Source Dump: ${BACKUP_FILE}"
echo "Isolated Target DB: ${RESTORE_TARGET_DB}"
echo "=========================================="

if command -v pg_restore >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then
  echo "1. Re-creating clean disposable test database '${RESTORE_TARGET_DB}'..."
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_TARGET_DB};"
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${RESTORE_TARGET_DB};"

  echo "2. Restoring archive into '${RESTORE_TARGET_DB}'..."
  pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${RESTORE_TARGET_DB}" --clean --if-exists "${BACKUP_FILE}"

  echo "3. Executing verification queries..."
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${RESTORE_TARGET_DB}" -c "
    SELECT 
      (SELECT count(*) FROM users) AS total_users,
      (SELECT count(*) FROM categories) AS total_categories,
      (SELECT count(*) FROM products) AS total_products,
      (SELECT count(*) FROM inventory) AS total_inventory;
  "
  echo "SUCCESS: Restoration and row-count verification completed cleanly!"
else
  echo "Native pg tools not found. Executing via Docker..."
  docker compose exec -T postgres psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_TARGET_DB}; CREATE DATABASE ${RESTORE_TARGET_DB};"
  docker compose exec -T postgres pg_restore -U "${DB_USER}" -d "${RESTORE_TARGET_DB}" --clean --if-exists < "${BACKUP_FILE}"
  docker compose exec -T postgres psql -U "${DB_USER}" -d "${RESTORE_TARGET_DB}" -c "SELECT count(*) FROM products; SELECT count(*) FROM users;"
  echo "SUCCESS: Restoration verified via Docker container."
fi
