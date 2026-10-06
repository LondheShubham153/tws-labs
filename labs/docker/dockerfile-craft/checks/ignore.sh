. "$LAB_LIB"
[ -f app/.dockerignore ] || fail "No app/.dockerignore yet."
grep -Eq '^(\*\*/|/)?node_modules/?[[:space:]]*$' app/.dockerignore || fail ".dockerignore does not list node_modules yet."
