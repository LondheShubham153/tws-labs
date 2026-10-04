. "$LAB_LIB"
[ -f recent.txt ] || fail "recent.txt does not exist yet."
cmp -s recent.txt <(tail -n 3 service.log) || fail "recent.txt should hold exactly the last 3 lines of service.log."
