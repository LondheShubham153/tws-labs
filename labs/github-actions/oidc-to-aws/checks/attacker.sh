. "$LAB_LIB"
[ -f shop/attacker.txt ] || fail "shop/attacker.txt does not exist yet."
x=$(head -n1 shop/attacker.txt | tr -d ' \r')
[ -n "$x" ] || fail "shop/attacker.txt is empty."
case "$x" in */*) ;; *) fail "Write it as owner/repo, for example acme-corp/shop.";; esac
[ "$x" != "acme-corp/shop" ] || fail "That is the real repo - find a different one the pattern still lets in."
[[ "repo:$x:ref:refs/heads/main" == repo:acme-corp*/shop*:ref:refs/heads/main ]] || fail "The pattern would not match '$x'."
