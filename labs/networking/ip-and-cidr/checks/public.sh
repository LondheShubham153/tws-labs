. "$LAB_LIB"
is_private() { [[ $1 =~ ^10\. || $1 =~ ^192\.168\. || $1 =~ ^172\.(1[6-9]|2[0-9]|3[01])\. ]]; }
want=""
while read -r ip; do is_private "$ip" || want=$ip; done < candidates.txt
[ -f public.txt ] || fail "public.txt does not exist yet - write the answer into it."
got=$(tr -d ' \t\r\n' < public.txt)
[ "$got" = "$want" ] || fail "public.txt says '$got' - that one is not the public address in candidates.txt."
