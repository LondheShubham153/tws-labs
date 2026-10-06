# Tiny Dockerfile reader for the checks (sourced, not a check itself).
# df_load FILE : join continued lines, drop comments and blank lines -> $DF (as written) and $DFL (lower case)
df_load() {
  DF=$(awk '{ sub(/^[ \t]+/, ""); if ($0 ~ /^#/ || $0 == "") next; line = line $0
             if (line ~ /\\[ \t]*$/) { sub(/\\[ \t]*$/, " ", line); next } gsub(/[ \t]+/, " ", line); print line; line = "" }
           END { if (line != "") { gsub(/[ \t]+/, " ", line); print line } }' "$1")
  DFL=$(printf '%s\n' "$DF" | tr 'A-Z' 'a-z')
}
# df_n REGEX : position (among instructions) of the first lower-case line matching REGEX; empty if none
df_n() { printf '%s\n' "$DFL" | grep -n -E -m1 -- "$1" | cut -d: -f1; }
# df_line N : instruction N as written
df_line() { printf '%s\n' "$DF" | sed -n "${1}p"; }
# Patterns shared by several checks
RE_PKG='^copy( --[^ ]+)* .*package[^ ]*\.json'
RE_INSTALL='^run .*npm (ci|install|i)( |$)'
RE_COPYALL='^copy( --[^ ]+)* \.(/)? '
