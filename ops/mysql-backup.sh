#!/bin/sh
set -u

dir="${BACKUP_DIR:-/backups}"
keep="${BACKUP_KEEP:-14}"
interval="${BACKUP_INTERVAL_SECONDS:-86400}"

options="$(mktemp)"
trap 'rm -f "$options"' EXIT
chmod 600 "$options"
escaped="$(printf '%s' "$MYSQL_ROOT_PASSWORD" | sed 's/\\/\\\\/g; s/"/\\"/g')"
printf '[client]\nuser=root\npassword="%s"\n' "$escaped" > "$options"

backup_once() {
    stamp="$(date -u +%Y%m%d-%H%M%S)"
    partial="$dir/.case-$stamp.sql.partial"
    if mysqldump --defaults-extra-file="$options" --host="$MYSQL_HOST" \
        --single-transaction --routines --triggers "$MYSQL_DATABASE" > "$partial"; then
        mv "$partial" "$dir/case-$stamp.sql"
        ls -1 "$dir" | grep -E '^case-[0-9]{8}-[0-9]{6}\.sql$' | sort -r | tail -n +"$((keep + 1))" | while read -r old; do
            rm -f "$dir/$old"
        done
        return 0
    fi
    rm -f "$partial"
    echo "[backup] mysqldump failed" >&2
    return 1
}

while :; do
    backup_once
    status=$?
    if [ "${BACKUP_ONCE:-}" = "1" ]; then
        exit "$status"
    fi
    sleep "$interval"
done
