. "$LAB_LIB"
[ -f pid1.txt ] || fail "pid1.txt does not exist yet."
want=$(tr -d '[:space:]' < /proc/1/comm)
[ "$(tr -d '[:space:]' < pid1.txt)" = "$want" ] || fail "pid1.txt should hold the name of process 1 (see /proc/1/comm)."
