. "$LAB_LIB"
[ -f cgroup.txt ] || fail "cgroup.txt does not exist yet."
[ "$(cat cgroup.txt)" = "$(cat "/proc/$LAB_SHELL_PID/cgroup" 2>/dev/null)" ] || fail "cgroup.txt should contain exactly what /proc/self/cgroup prints."
