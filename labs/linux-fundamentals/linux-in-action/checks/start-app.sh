. "$LAB_LIB"
[ -x start.sh ] || fail "start.sh is not executable yet."
ran_re '(^|[;&|][[:space:]]*)\./start\.sh' || fail "Run the script with ./start.sh."
file_has .service_status '^ONLINE [0-9]+$' || fail "The service is not online yet - did start.sh finish without errors?"
