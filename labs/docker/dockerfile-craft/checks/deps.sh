. "$LAB_LIB"
. "$(dirname "$0")/_df.sh"
[ -f app/Dockerfile ] || fail "No app/Dockerfile yet - create it inside the app folder."
df_load app/Dockerfile
pkg=$(df_n "$RE_PKG"); inst=$(df_n "$RE_INSTALL"); all=$(df_n "$RE_COPYALL")
[ -n "$inst" ] || fail "No dependency install yet. Add a RUN step that runs npm ci."
if [ -n "$all" ] && [ "$all" -lt "$inst" ]; then
  fail "You copy all the source before installing, so any code edit re-runs the install. Copy only the package files first."
fi
[ -n "$pkg" ] || fail "Copy package.json and package-lock.json into the image before the install step."
[ "$pkg" -lt "$inst" ] || fail "The package files must be copied before the install step, or the install has nothing to read."
