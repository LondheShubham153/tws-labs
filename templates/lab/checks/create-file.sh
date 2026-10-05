# Exit 0 = pass. The first line printed = the message shown on failure (a nudge, never the answer).
# Grade real state (files, modes, git, processes). Helpers live in labs/lib.sh: fail, file_has, ran, ran_re, shell_cwd, proc_running, in_repo.
. "$LAB_LIB"
[ -f hello.txt ] || fail "hello.txt does not exist yet."
file_has hello.txt '^hello$' || fail "hello.txt should contain the word hello."
