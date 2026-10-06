. "$LAB_LIB"
toint() { local IFS=.; set -- $1; echo $(($1 << 24 | $2 << 16 | $3 << 8 | $4)); }
a=$(sed -n 1p pair.txt); b=$(sed -n 2p pair.txt)
as=$(toint "${a%/*}"); ae=$((as + (1 << (32 - ${a#*/})) - 1))
bs=$(toint "${b%/*}"); be=$((bs + (1 << (32 - ${b#*/})) - 1))
if [ "$as" -le "$be" ] && [ "$bs" -le "$ae" ]; then want=yes; else want=no; fi
[ -f overlap.txt ] || fail "overlap.txt does not exist yet - write yes or no into it."
got=$(tr -d ' \t\r\n' < overlap.txt | tr 'A-Z' 'a-z')
[ "$got" = "$want" ] || fail "overlap.txt says '$got' - compare where each block starts and ends."
