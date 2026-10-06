#!/bin/bash
# Two private ports (web server and TLS server), a per-session code, and the tiny web server the lab talks to.
busy() { grep -qiE "^ *[0-9]+: [0-9A-F]+:$(printf '%04X' "$1") " /proc/net/tcp /proc/net/tcp6 2>/dev/null; }
picked=""
while [ "$(echo $picked | wc -w)" -lt 2 ]; do
  p=$((20000 + (RANDOM << 15 | RANDOM) % 12000))
  case " $picked " in *" $p "*) continue ;; esac
  busy "$p" || picked="$picked $p"
done
set -- $picked
echo "$1" > port.txt
echo "$2" > port2.txt
printf '%04x%04x\n' $RANDOM $RANDOM > .code

cat > server.sh <<'SERVER'
#!/bin/bash
# A tiny web server with two sites, chosen by the Host header. It is short on purpose - read it.
port=$(cat "$HOME/port.txt")
code=$(cat "$HOME/.code")
handle() {
  read -r request_line
  host=""
  while IFS= read -r line; do
    line=${line%$'\r'}
    [ -z "$line" ] && break
    case "${line,,}" in host:*) host=${line#*: } ;; esac
  done
  host=${host%%:*}
  case "$host" in
    app.test)   status="200 OK";        body="Welcome to app.test [$code]" ;;
    admin.test) status="200 OK";        body="Welcome to admin.test, staff only [$code]" ;;
    *)          status="404 Not Found"; body="No site called '$host' here" ;;
  esac
  printf 'HTTP/1.1 %s\r\nContent-Type: text/plain\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s\n' "$status" $((${#body} + 1)) "$body"
}
fifo=$(mktemp -u)
mkfifo "$fifo"
trap 'rm -f "$fifo"' EXIT
while true; do
  nc -l 127.0.0.1 "$port" < "$fifo" | handle > "$fifo"
done
SERVER
