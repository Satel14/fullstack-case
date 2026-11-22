#!/bin/sh
set -eu
umask 077

cd "$(dirname "$0")/.."

if [ "$#" -ne 2 ]; then
    echo "usage: sh ops/init-env.sh <domain> <email for Let's Encrypt>" >&2
    exit 2
fi
domain="$1"
email="$2"

case "$domain" in
    ''|*[!A-Za-z0-9.-]*) echo "init-env.sh: $domain is not a domain name" >&2; exit 2 ;;
esac
case "$email" in
    *@*.*) ;;
    *) echo "init-env.sh: $email is not an email address" >&2; exit 2 ;;
esac
case "$email" in
    *[!A-Za-z0-9.@_+-]*) echo "init-env.sh: $email is not an email address" >&2; exit 2 ;;
esac

if [ -e .env ]; then
    echo "init-env.sh: .env already exists and is left as it is" >&2
    exit 1
fi

jwt="$(openssl rand -hex 32)"
root_password="$(openssl rand -hex 16)"
app_password="$(openssl rand -hex 16)"
redis_password="$(openssl rand -hex 16)"

sed -e "s|^JWT_SECRET=.*|JWT_SECRET=$jwt|" \
    -e "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$redis_password|" \
    -e "s|^MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=$root_password|" \
    -e "s|^DB_APP_PASSWORD=.*|DB_APP_PASSWORD=$app_password|" \
    -e "s|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=https://$domain|" \
    -e "s|^DOMAIN=.*|DOMAIN=$domain|" \
    -e "s|^ACME_EMAIL=.*|ACME_EMAIL=$email|" \
    .env.example > .env.partial
chmod 600 .env.partial
mv .env.partial .env

echo "init-env.sh: wrote .env for https://$domain with fresh passwords and a fresh JWT secret."
echo "Fill in by hand before players register: RESEND_API_KEY and RESEND_FROM (mail), REACT_APP_SUPPORT_EMAIL (optional)."
