. "$LAB_LIB"
. "$(dirname "$0")/_df.sh"
[ -f app/Dockerfile ] || fail "No app/Dockerfile yet - create it inside the app folder."
df_load app/Dockerfile
u=$(df_n '^user '); inst=$(df_n "$RE_INSTALL")
[ -n "$u" ] || fail "No USER yet, so the app would run as root."
who=$(df_line "$u" | awk '{ print $2 }')
case "$who" in root|0|root:*|0:*) fail "USER is still root. Name an unprivileged user." ;; esac
[ -z "$inst" ] || [ "$u" -gt "$inst" ] || fail "Switch user after the install: npm needs root to write into the working folder."
