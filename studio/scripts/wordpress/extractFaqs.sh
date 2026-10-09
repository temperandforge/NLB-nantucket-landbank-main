#!/bin/bash
# READ-ONLY. Extracts the FAQs from the local WordPress site (Local by
# Flywheel, site "nlb") into studio/scripts/data/wordpress/faqs.json. Run from anywhere:
#
#   studio/scripts/wordpress/extractFaqs.sh
#
# Override the Local site's database socket and path with WP_SOCK and WP_PATH if they differ.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOCK="${WP_SOCK:-$HOME/Library/Application Support/Local/run/K8NAZJUBt/mysql/mysqld.sock}"
WP_PATH="${WP_PATH:-$HOME/Local Sites/nlb/app/public}"
exec php -d mysqli.default_socket="$SOCK" -d pdo_mysql.default_socket="$SOCK" \
  /opt/homebrew/bin/wp --path="$WP_PATH" --skip-plugins eval-file "$HERE/extractFaqs.php"
