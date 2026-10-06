. "$LAB_LIB"
listening "$(cat port3.txt)" && fail "Something listens on the port in port3.txt - stop it, nobody should be there."
grep -qi 'refused' refused.txt 2>/dev/null || fail "refused.txt does not show a refused connection. Run curl with -v as shown and keep its output."
