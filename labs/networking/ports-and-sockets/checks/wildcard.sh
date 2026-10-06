. "$LAB_LIB"
hex=$(printf '%04X' "$(cat port2.txt)")
{ awk -v want="00000000:$hex" '$4 == "0A" && $2 == want { f = 1 } END { exit !f }' /proc/net/tcp 2>/dev/null; } \
  || fail "Nothing listens on 0.0.0.0:$(cat port2.txt) yet."
