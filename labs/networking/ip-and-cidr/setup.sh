#!/bin/bash
# Seeds numbers that are different for every learner, so answers cannot be copied.
# Everything here is plain arithmetic: block.txt, pair.txt and candidates.txt.
dotted() { echo "$(($1 >> 24 & 255)).$(($1 >> 16 & 255)).$(($1 >> 8 & 255)).$(($1 & 255))"; }
rnd24() { echo $(( (RANDOM << 15 | RANDOM) & 0xFFFFFF )); }
octet() { echo $((RANDOM % 254 + 1)); }

# One block inside 10.0.0.0/8, aligned to its own size (so it is a real network address).
sizes=(20 21 22 23 25 26 27)
n=${sizes[RANDOM % 7]}; h=$((32 - n))
base=$(( ((10 << 24 | $(rnd24)) >> h) << h ))
echo "$(dotted $base)/$n" > block.txt

# Two blocks: sometimes one sits inside the other, sometimes they are next-door neighbours.
an=$((20 + RANDOM % 6)); ah=$((32 - an))
abase=$(( ((10 << 24 | $(rnd24)) >> ah) << ah ))
if [ $((RANDOM % 2)) -eq 0 ]; then
  bn=$((an + 1 + RANDOM % 2)); bh=$((32 - bn))
  bbase=$(( abase + (RANDOM % (1 << (bn - an))) * (1 << bh) ))
else
  bn=$an
  bbase=$(( abase ^ (1 << ah) ))
fi
if [ $((RANDOM % 2)) -eq 0 ]; then
  printf '%s/%s\n%s/%s\n' "$(dotted $abase)" $an "$(dotted $bbase)" $bn > pair.txt
else
  printf '%s/%s\n%s/%s\n' "$(dotted $bbase)" $bn "$(dotted $abase)" $an > pair.txt
fi

# Three addresses: two private (from two different private ranges) and one that only looks private.
privates=("10.$(octet).$(octet).$(octet)" "172.$((16 + RANDOM % 16)).$(octet).$(octet)" "192.168.$(octet).$(octet)")
lookalikes=("172.32.$(octet).$(octet)" "172.15.$(octet).$(octet)" "192.167.$(octet).$(octet)" "11.$(octet).$(octet).$(octet)")
skip=$((RANDOM % 3))
{
  for i in 0 1 2; do [ "$i" -ne "$skip" ] && echo "${privates[$i]}"; done
  echo "${lookalikes[RANDOM % 4]}"
} | shuf > candidates.txt
