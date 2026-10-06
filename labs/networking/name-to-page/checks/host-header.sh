. "$LAB_LIB"
code=$(cat .code)
file_has admin.txt "Welcome to admin\.test.*\[$code\]" || fail "admin.txt does not hold the admin.test page. Send the Host header with -H and keep the output."
