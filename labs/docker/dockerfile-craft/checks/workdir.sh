. "$LAB_LIB"
. "$(dirname "$0")/_df.sh"
[ -f app/Dockerfile ] || fail "No app/Dockerfile yet - create it inside the app folder."
df_load app/Dockerfile
n=$(df_n '^workdir ')
[ -n "$n" ] || fail "No WORKDIR yet. Add one so later steps run from a known folder."
[ "$n" -gt 1 ] || fail "WORKDIR should come after FROM."
