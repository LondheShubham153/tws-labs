#!/bin/bash
# Every learner shares one machine, so each gets their own ports: port.txt, port2.txt and port3.txt.
busy() { grep -qiE "^ *[0-9]+: [0-9A-F]+:$(printf '%04X' "$1") " /proc/net/tcp /proc/net/tcp6 2>/dev/null; }
picked=""
while [ "$(echo $picked | wc -w)" -lt 3 ]; do
  p=$((20000 + (RANDOM << 15 | RANDOM) % 12000))
  case " $picked " in *" $p "*) continue ;; esac
  busy "$p" || picked="$picked $p"
done
set -- $picked
echo "$1" > port.txt
echo "$2" > port2.txt
echo "$3" > port3.txt
