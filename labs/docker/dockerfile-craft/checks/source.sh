. "$LAB_LIB"
. "$(dirname "$0")/_df.sh"
[ -f app/Dockerfile ] || fail "No app/Dockerfile yet - create it inside the app folder."
df_load app/Dockerfile
inst=$(df_n "$RE_INSTALL"); all=$(df_n "$RE_COPYALL")
[ -n "$all" ] || fail "The application source is not copied into the image yet."
[ -n "$inst" ] && [ "$all" -gt "$inst" ] || fail "Copy the rest of the source after the install step, so editing code does not redo the install."
