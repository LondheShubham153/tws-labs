. "$LAB_LIB"
port=$(cat port.txt)
# 127.0.0.1 is 0100007F in /proc/net/tcp; state 0A is LISTEN
awk -v want="0100007F:$(printf '%04X' "$port")" '$4 == "0A" && $2 == want { f = 1 } END { exit !f }' /proc/net/tcp 2>/dev/null \
  || fail "Nothing listens on 127.0.0.1:$port yet. Start nc as shown, and end the line with & ."
