. "$LAB_LIB"
[ -f mypid.txt ] || fail "mypid.txt does not exist yet."
[ "$(tr -d '[:space:]' < mypid.txt)" = "$LAB_SHELL_PID" ] || fail "mypid.txt should hold your shell's process ID (the value of \$\$)."
