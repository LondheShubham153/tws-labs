. "$LAB_LIB"
[ -f maxprocs.txt ] || fail "maxprocs.txt does not exist yet."
want=$(awk '$1 == "Max" && $2 == "processes" { print $3 }' "/proc/$LAB_SHELL_PID/limits" 2>/dev/null)
[ -n "$want" ] || fail "Could not read your shell's limits."
[ "$(tr -d '[:space:]' < maxprocs.txt)" = "$want" ] || fail "maxprocs.txt should hold the number printed by ulimit -u."
