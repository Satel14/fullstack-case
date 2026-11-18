#!/bin/sh
set -u
umask 077

dir="${BACKUP_DIR:-/backups}"
keep="${BACKUP_KEEP:-14}"
interval="${BACKUP_INTERVAL_SECONDS:-86400}"
retry="${BACKUP_RETRY_SECONDS:-60}"

age_of_newest() {
    newest="$(ls -1 "$dir" | grep -E '^case-[0-9]{8}-[0-9]{6}\.sql$' | sort -r | head -n 1)"
    [ -n "$newest" ] || return 1
    echo $(( $(date +%s) - $(stat -c %Y "$dir/$newest") ))
}

if [ "${1:-}" = "--healthy" ]; then
    age="$(age_of_newest)" || exit 1
    [ "$age" -le $(( interval + 3600 )) ]
    exit $?
fi

chmod 700 "$dir" 2>/dev/null
rm -f "$dir"/.case-*.sql.partial

partial=""
options="$(mktemp)"
trap 'rm -f "$options" ${partial:+"$partial"}' EXIT
sleeper=""
trap '[ -n "$sleeper" ] && kill "$sleeper" 2>/dev/null; exit 143' TERM INT
escaped="$(printf '%s' "$MYSQL_ROOT_PASSWORD" | sed 's/\\/\\\\/g; s/"/\\"/g')"
printf '[client]\nuser=root\npassword="%s"\n' "$escaped" > "$options"

backup_once() {
    stamp="$(date -u +%Y%m%d-%H%M%S)"
    partial="$dir/.case-$stamp.sql.partial"
    if mysqldump --defaults-extra-file="$options" --host="$MYSQL_HOST" \
        --single-transaction --routines --triggers "$MYSQL_DATABASE" > "$partial"; then
        mv "$partial" "$dir/case-$stamp.sql"
        partial=""
        ls -1 "$dir" | grep -E '^case-[0-9]{8}-[0-9]{6}\.sql$' | sort -r | tail -n +"$((keep + 1))" | while read -r old; do
            rm -f "$dir/$old"
        done
        return 0
    fi
    rm -f "$partial"
    partial=""
    echo "[backup] mysqldump failed" >&2
    return 1
}

pause_for() {
    sleep "$1" > /dev/null 2>&1 &
    sleeper=$!
    wait "$sleeper"
    sleeper=""
}

if age="$(age_of_newest)" && [ "$age" -lt "$interval" ]; then
    if [ "${BACKUP_ONCE:-}" = "1" ]; then
        exit 0
    fi
    pause_for $(( interval - age ))
fi

while :; do
    if backup_once; then
        status=0
        pause="$interval"
    else
        status=1
        pause="$retry"
    fi
    if [ "${BACKUP_ONCE:-}" = "1" ]; then
        exit "$status"
    fi
    pause_for "$pause"
done
