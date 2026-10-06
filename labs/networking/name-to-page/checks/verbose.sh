. "$LAB_LIB"
[ -s verbose.txt ] || fail "verbose.txt is empty or missing. Send curl's stderr into it with 2>."
grep -q '^> Host: app\.test' verbose.txt || fail "verbose.txt has no '> Host: app.test' line - use the --resolve command with -v."
grep -q '^< HTTP/1.1 200' verbose.txt || fail "verbose.txt has no '< HTTP/1.1 200' line - was the server running?"
