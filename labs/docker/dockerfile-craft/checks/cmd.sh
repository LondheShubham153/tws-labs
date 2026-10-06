. "$LAB_LIB"
. "$(dirname "$0")/_df.sh"
[ -f app/Dockerfile ] || fail "No app/Dockerfile yet - create it inside the app folder."
df_load app/Dockerfile
n=$(printf '%s\n' "$DFL" | grep -n -E '^cmd ' | tail -1 | cut -d: -f1)
[ -n "$n" ] || fail "No CMD yet. The image needs a command to start the app."
body=$(df_line "$n" | sed -E 's/^[Cc][Mm][Dd][[:space:]]+//')
case "$body" in \[*) ;; *) fail "That CMD is in shell form, which wraps your app in /bin/sh -c. Write it as a JSON array." ;; esac
printf '%s' "$body" | jq -e 'type == "array" and length > 0' >/dev/null 2>&1 || fail "The CMD array is not valid JSON: use double quotes and commas."
printf '%s' "$body" | grep -q 'server.js' || fail "The CMD should start the app: node server.js."
