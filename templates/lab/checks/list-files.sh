# `ran` reads the learner's command history. Use it only when a command leaves no state to inspect (listing files does not).
. "$LAB_LIB"
ran_re '(^|[;&|][[:space:]]*)ls[[:space:]]+(-[a-zA-Z]*l|--long)' || fail "Run ls with the long-format option."
