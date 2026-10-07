. "$LAB_LIB"
[ -f proj/config.local ] || fail "config.local must remain on disk in your working tree."
! in_repo proj ls-files --error-unmatch config.local >/dev/null 2>&1 || fail "config.local is still tracked in the Git index."
in_repo proj check-ignore -q config.local || fail "Add config.local to .gitignore so it remains ignored."