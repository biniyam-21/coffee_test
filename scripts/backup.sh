#!/usr/bin/env bash
# ==============================================================
# Coffee Shop Order Management System (Akufada)
# Database Backup Automation Script (Bash / POSIX)
# ==============================================================

set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-akufada_db}"
DB_USER="${POSTGRES_USER:-akufada_admin}"
OUTPUT_DIR="${OUTPUT_DIR:-./backups}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "${OUTPUT_DIR}"
BACKUP_PATH="${OUTPUT_DIR}/akufada_backup_${TIMESTAMP}.dump"

echo "=========================================="
echo "AKUFADA DATABASE BACKUP"
echo "Target: ${BACKUP_PATH}"
echo "=========================================="

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "${BACKUP_PATH}"
  echo "SUCCESS: Backup created successfully at ${BACKUP_PATH}"
  ls -lh "${BACKUP_PATH}"
else
  echo "Native pg_dump not found. Using Docker container..."
  docker compose exec -T postgres pg_dump -U "${DB_USER}" -Fc "${DB_NAME}" > "${BACKUP_PATH}"
  echo "SUCCESS: Backup created via Docker at ${BACKUP_PATH}"
  ls -lh "${BACKUP_PATH}"
fi
