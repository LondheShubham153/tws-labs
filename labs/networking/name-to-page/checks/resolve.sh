. "$LAB_LIB"
code=$(cat .code)
file_has page.txt "Welcome to app\.test \[$code\]" || fail "page.txt does not hold the app.test page. Run the curl --resolve command and keep its output."
