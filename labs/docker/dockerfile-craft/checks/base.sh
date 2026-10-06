. "$LAB_LIB"
. "$(dirname "$0")/_df.sh"
[ -f app/Dockerfile ] || fail "No app/Dockerfile yet - create it inside the app folder."
df_load app/Dockerfile
first=$(printf '%s\n' "$DFL" | head -1)
case "$first" in from\ *) ;; *) fail "The first instruction should be FROM, naming the base image." ;; esac
img=$(printf '%s\n' "$first" | sed -E 's/^from +(--[^ ]+ +)?//; s/ .*//')
case "$img" in node*) ;; *) fail "The sample app is Node: start from a node image (FROM node:<version>)." ;; esac
case "$img" in *@sha256:*) exit 0 ;; esac
tag="${img##*/}"
case "$tag" in *:*) tag="${tag#*:}" ;; *) fail "FROM $img has no tag, which means latest. Pin an exact version." ;; esac
[ "$tag" != "latest" ] || fail "FROM uses the latest tag, which changes under you. Pin an exact version."
