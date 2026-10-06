. "$LAB_LIB"
. "$(dirname "$0")/_df.sh"
[ -f Dockerfile ] || fail "No Dockerfile yet - create ~/Dockerfile."
df_load Dockerfile
froms=$(printf '%s\n' "$DFL" | grep -c '^from ')
[ "$froms" -ge 2 ] || fail "A multi-stage build needs at least two FROM lines (a build stage and a final stage)."
printf '%s\n' "$DFL" | grep -q '^from .* as ' || fail "Name the first stage, for example: FROM node:22-alpine AS build."
final=$(printf '%s\n' "$DFL" | awk '/^from /{ s = ""; next } { s = s "\n" $0 } END { print s }')
printf '%s\n' "$final" | grep -Eq '^copy .*--from=' || fail "The final stage should take its files with COPY --from=<stage>."
if printf '%s\n' "$final" | grep -E '^(copy|add) ' | grep -vq -- '--from='; then
  fail "The final stage copies from your own folder. Take everything from the build stage instead."
fi
