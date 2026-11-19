#!/usr/bin/env bash
# Runs mngr's installer in a throwaway HOME and records what happened.
#
# usage: repro/repro.sh <arm-name> <stock|homebrew> <path-or-url-of-install.sh>
#
#   stock     PATH has no Homebrew: no uv, only macOS's /usr/bin/python3 (3.9),
#             so the installer fetches uv and uv downloads its own Python.
#   homebrew  PATH starts with /opt/homebrew/bin: Homebrew's uv and python3.
#
# Writes repro/logs/<arm>.log (full output) and appends one JSON line to
# repro/logs/runs.jsonl. Nothing outside the throwaway HOME is changed.
set -uo pipefail

arm=$1 setup=$2 script=$3
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$here/logs"
log="$here/logs/$arm.log"
home=$(mktemp -d "${TMPDIR:-/tmp}/mngr-install-$arm.XXXX")

case "$setup" in
  stock) path="$home/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin" ;;
  homebrew) path="$home/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" ;;
  *) echo "setup must be stock or homebrew" >&2; exit 2 ;;
esac

if [[ $script == https://* ]]; then
  curl -fsSL "$script" -o "$home/install.sh" || exit 1
else
  cp "$script" "$home/install.sh"
fi

run() { env -i HOME="$home" PATH="$path" SHELL=/bin/zsh TERM=dumb bash -c "$1" < /dev/null; }

started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
run 'bash "$HOME/install.sh"' > "$log" 2>&1
install_exit=$?
python_on_path=$(run 'python3 --version 2>&1')
version=$(run 'mngr --version 2>&1')
version_exit=$?
run 'mngr list' >> "$log" 2>&1
list_exit=$?
tool_python=$(run '"$HOME/.local/share/uv/tools/imbue-mngr/bin/python" --version 2>&1' || true)

python3 - "$arm" "$setup" "$script" "$started" "$install_exit" "$python_on_path" \
  "$version" "$version_exit" "$list_exit" "$tool_python" "$log" >> "$here/logs/runs.jsonl" <<'EOF'
import json, sys
(arm, setup, script, started, install_exit, python_on_path, version, version_exit,
 list_exit, tool_python, log) = sys.argv[1:]
lines = open(log, errors="replace").read().splitlines()
errors = [l.strip() for l in lines if "fatal error" in l or l.startswith("error:") or "ERROR" in l]
print(json.dumps({
    "arm": arm, "setup": setup, "script": script, "startedAt": started,
    "installExit": int(install_exit), "pythonOnPath": python_on_path,
    "mngrVersion": version if int(version_exit) == 0 else None,
    "mngrListExit": int(list_exit),
    "toolPython": tool_python if tool_python.startswith("Python") else None,
    "errors": errors[:3],
}))
EOF
rm -rf "$home"
echo "$arm: install exit $install_exit, mngr list exit $list_exit"
