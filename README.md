# mngr's installer on Python 3.15: a one-flag fix (unofficial demo)

On a Mac whose newest Python is 3.15 (Homebrew's `python3` is 3.15.2 today), mngr's documented install

```bash
curl -fsSL https://raw.githubusercontent.com/imbue-ai/mngr/main/scripts/install.sh | bash
```

fails: uv builds the tool env on 3.15, `cel-python` 0.5.0 (a mngr dependency) needs `google-re2`, and google-re2's
latest release (1.1.20251105) has wheels only up to cp314, so uv compiles it and the build stops at
`fatal error: 'absl/strings/string_view.h' file not found`. No `mngr` gets installed.

Fix: `uv tool install imbue-mngr --python 3.12` in `scripts/install.sh` (plus the README's manual lines), on
[cherylaurelia/mngr `fix/install-python-312`](https://github.com/imbue-ai/mngr/compare/main...cherylaurelia:mngr:fix/install-python-312).
3.12 is the package's `requires-python` floor and what uv already downloads on a Mac without Homebrew.

Upstream: [google/re2#647](https://github.com/google/re2/issues/647) (no 3.15 wheels yet). The pin can be dropped once they ship. Existing installs aren't touched: install.sh's upgrade branch runs `uv tool upgrade`, which keeps each env's Python. The branch also regenerates libs/mngr/README.md (`scripts/make_cli_docs.py`), which their docs ratchet checks.

## Reproduce

```bash
repro/repro.sh homebrew-main homebrew https://raw.githubusercontent.com/imbue-ai/mngr/main/scripts/install.sh
repro/repro.sh homebrew-fix  homebrew https://raw.githubusercontent.com/cherylaurelia/mngr/c8664a34b0a1c9f41a882919c75b26362c1f5065/scripts/install.sh
repro/repro.sh stock-main    stock    https://raw.githubusercontent.com/imbue-ai/mngr/main/scripts/install.sh
repro/repro.sh stock-fix     stock    https://raw.githubusercontent.com/cherylaurelia/mngr/c8664a34b0a1c9f41a882919c75b26362c1f5065/scripts/install.sh
# the rejected range variant (branch variant/python-range)
repro/repro.sh range-homebrew-fix homebrew https://raw.githubusercontent.com/cherylaurelia/mngr/856436e34339438cbc726178692f462bd239237d/scripts/install.sh
repro/repro.sh range-stock-fix    stock    https://raw.githubusercontent.com/cherylaurelia/mngr/856436e34339438cbc726178692f462bd239237d/scripts/install.sh
```

Each run uses an empty `HOME` (nothing of yours is touched; it's deleted afterwards), writes `repro/logs/<arm>.log`
and one JSON line to `repro/logs/runs.jsonl`. `homebrew` needs Homebrew's `uv` and `python@3.15`. `data/runs.json`
is those six lines plus short log excerpts, with home paths replaced by `$HOME`.

Results on 2026-11-18 (macOS 26, Apple silicon):

| Setup | install.sh | Tool Python | Result |
|---|---|---|---|
| Homebrew (uv 0.13.6, python3 3.15.2) | main | none | exit 1, google-re2 build fails |
| Homebrew | fix branch | 3.12.16 | installed, `mngr list` exit 0 |
| Stock Mac (/usr/bin/python3 3.9.6) | main | 3.12.15 | installed |
| Stock Mac | fix branch | 3.12.15 | installed |
| Homebrew | range variant `'>=3.12,<3.15'` | 3.14.10 | installed |
| Stock Mac | range variant | 3.14.8 | installed, but moved off 3.12 |

The range variant fixes Homebrew too but changes the Python of every stock-Mac install to 3.14, which mngr's CI
doesn't run, so the fix pins 3.12 exactly. Not tested: Linux with 3.15 as the newest Python.

Also checked: Python 3.14 installs fine; `mngr plugin add imbue-mngr-docker` after the fixed install keeps the 3.12
env (uv stores `python = "3.12"` in the tool receipt); a `requires-python` cap of `<3.15` does not help (uv still
picks 3.15 first and builds re2). In the fix branch, `test_install_script.py` asserts the flag: 1 failure without the
install.sh change, 7/7 pass with it.

## The page

Next.js, reads `data/runs.json` at build time. `npm install && npm run build && npm start`; `npm test` checks the
data parser and that the recorded runs fail only on Homebrew without the fix; `npm run lint` runs oxlint.

Unofficial demo by Cheryl Aurelia: not affiliated with Imbue.
