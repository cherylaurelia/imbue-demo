import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findRun, type InstallRun, installed, parseRunData, type ScriptVersion, scriptVersion } from "@/lib/runs";

const data = parseRunData(readFileSync(join(process.cwd(), "data/runs.json"), "utf8"));

const BRANCH_URL = "https://github.com/imbue-ai/mngr/compare/main...cherylaurelia:mngr:fix/install-python-312";
const DEMO_REPO_URL = "https://github.com/cherylaurelia/imbue-demo";
const REPRO_URL = `${DEMO_REPO_URL}/blob/main/repro/repro.sh`;
const RE2_ISSUE_URL = "https://github.com/google/re2/issues/647";

const DIFF = `# scripts/install.sh
 else
     info "Installing mngr..."
-    uv tool install imbue-mngr
+    # Pin 3.12 (the floor, and what uv picks on a machine with no Python): google-re2
+    # (via cel-python) has no 3.15 wheel yet, so uv would build it from source and fail
+    # wherever 3.15 is the newest Python, e.g. Homebrew's python3. Drop the pin once
+    # https://github.com/google/re2/issues/647 ships 3.15 wheels.
+    uv tool install imbue-mngr --python 3.12
 fi`;

const SETUP_LABEL: Record<InstallRun["setup"], string> = {
  homebrew: "Mac with Homebrew (uv 0.13.6, python3 → 3.15.2)",
  stock: "Stock Mac, no Homebrew (/usr/bin/python3 → 3.9.6)",
};

const SCRIPT_LABEL: Record<ScriptVersion, string> = {
  main: "main",
  fix: "fix: --python 3.12",
  range: "variant: '>=3.12,<3.15'",
};

const before = findRun(data, "homebrew-main");
const after = findRun(data, "homebrew-fix");
const runTime = `${before.startedAt.slice(0, 16).replace("T", " ")} UTC`;

function Terminal({ title, run, lines }: { title: string; run: InstallRun; lines: string[] }) {
  const ok = installed(run);

  return (
    <figure className="min-w-0 overflow-hidden rounded-lg border border-ink/15 bg-ink text-sage">
      <figcaption className={`flex items-center justify-between px-4 py-2 text-sm font-semibold ${ok ? "bg-sage text-pass" : "bg-cream text-red"}`}>
        <span>{title}</span>
        <span className="font-mono">{ok ? "installed" : "exit 1, no mngr"}</span>
      </figcaption>
      <pre className="p-4 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap">
        <code>
          <span className="text-sky">$ curl -fsSL {run.script} | bash</span>
          {"\n"}
          {lines.map((line) => line.trim()).join("\n")}
        </code>
      </pre>
    </figure>
  );
}

function Result({ run }: { run: InstallRun }) {
  return installed(run) ? (
    <span className="font-semibold text-pass">installed, mngr list works</span>
  ) : (
    <span className="font-semibold text-red">fails building google-re2</span>
  );
}

export default function Page() {
  return (
    <>
      <header className="bg-sky">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-ink">
          <span className="font-mono text-sm">mngr · install on Python 3.15</span>
          <span className="rounded bg-paper/70 px-2 py-0.5 font-mono text-xs">unofficial demo</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <section className="pt-12 pb-8">
          <h1 className="font-serif text-4xl leading-tight font-bold md:text-5xl">
            mngr&apos;s one-line install fails on a Mac whose newest Python is 3.15.
          </h1>
          <p className="mt-5 max-w-3xl text-lg">
            <strong>Problem:</strong> Homebrew&apos;s <code className="font-mono">python3</code> is now 3.15, and google-re2 (via
            cel-python) has no 3.15 wheel, so <code className="font-mono">uv tool install imbue-mngr</code> fails and nothing installs.
            Tested: with <code className="font-mono">/opt/homebrew/bin</code> on PATH and no other Python, uv picks Homebrew&apos;s 3.15.
          </p>
          <p className="mt-3 max-w-3xl text-lg">
            <strong>Fix:</strong> one flag in <code className="font-mono">install.sh</code>,{" "}
            <code className="font-mono">--python 3.12</code>, the same Python a Mac without Homebrew already gets, until google-re2
            ships 3.15 wheels (<a className="underline" href={RE2_ISSUE_URL}>google/re2#647</a>). github.com/imbue-ai/mngr is a mirror, so
            this is a branch to copy, not a PR.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="rounded-md bg-ink px-4 py-2 font-semibold text-paper hover:bg-muted" href={BRANCH_URL}>
              See the fix branch
            </a>
            <a className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sage" href={REPRO_URL}>
              Rerun it: repro.sh
            </a>
            <a className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sage" href={DEMO_REPO_URL}>
              Demo repo
            </a>
          </div>
        </section>

        <section aria-labelledby="before-after" className="grid gap-4 md:grid-cols-2">
          <h2 id="before-after" className="sr-only">
            Before and after, same Mac setup
          </h2>
          <Terminal title="Before: install.sh on main" run={before} lines={data.excerpts["homebrew-main"] ?? before.errors} />
          <Terminal title="After: install.sh from the fix commit" run={after} lines={data.excerpts["homebrew-fix"] ?? []} />
        </section>
        <p className="mt-3 text-sm text-muted">
          Excerpts from real runs starting {runTime}, each in an empty HOME with Homebrew on PATH. The &ldquo;after&rdquo; tool env runs{" "}
          {after.toolPython}; <code className="font-mono">mngr --version</code> prints {after.mngrVersion}.
        </p>

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold">The change</h2>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-ink/15 bg-cream p-4 font-mono text-[13px] leading-relaxed">
            <code>{DIFF}</code>
          </pre>
          <p className="mt-3 max-w-3xl">
            Plus one assertion in the existing <code className="font-mono">test_install_script.py</code> (fails without the change,
            7/7 pass with it) and the two changelog entries your <code className="font-mono">check-changelog</code> gate asks for. The
            README&apos;s manual <code className="font-mono">uv tool install imbue-mngr</code> and{" "}
            <code className="font-mono">--with imbue-mngr-docker</code> lines hit the same error on 3.15 and need the same flag if you
            copy this; the branch leaves them alone to keep the change to the installer.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold">Every run, from repro.sh</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/30">
                  <th className="py-2 pr-4">Setup</th>
                  <th className="py-2 pr-4">install.sh</th>
                  <th className="py-2 pr-4">Tool Python</th>
                  <th className="py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.map((run) => (
                  <tr key={run.arm} className="border-b border-ink/10">
                    <td className="py-2 pr-4">{SETUP_LABEL[run.setup]}</td>
                    <td className="py-2 pr-4 font-mono">{SCRIPT_LABEL[scriptVersion(run)]}</td>
                    <td className="py-2 pr-4 font-mono">{run.toolPython ?? "none (3.15 build failed)"}</td>
                    <td className="py-2">
                      <Result run={run} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            The stock Mac rows are the control: there uv already downloads 3.12, so the pin changes nothing for those users. The
            range variant also fixes Homebrew, but moves the stock Mac to 3.14, a Python mngr&apos;s CI doesn&apos;t run, which is why the
            fix pins 3.12 exactly.
          </p>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-bold">Also checked</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Python 3.14 installs fine; only 3.15 lacks a google-re2 wheel.</li>
              <li>
                A CI job running install.sh on the newest Python would catch the next break like this before users do; their CI runs
                ubuntu&apos;s 3.12 today.
              </li>
              <li>
                <code className="font-mono">mngr plugin add imbue-mngr-docker</code> after the fixed install keeps the 3.12 env: uv
                saves <code className="font-mono">python = &quot;3.12&quot;</code> in the tool receipt.
              </li>
              <li>
                Capping <code className="font-mono">requires-python</code> at &lt;3.15 doesn&apos;t help: uv picks the interpreter first,
                then still builds re2 on 3.15.
              </li>
            </ul>
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-bold">When it can go</h2>
            <p className="mt-3">
              The root cause is upstream: google-re2&apos;s latest release (1.1.20251105) ships wheels up to 3.14 only. It&apos;s
              tracked in{" "}
              <a className="underline" href={RE2_ISSUE_URL}>
                google/re2#647
              </a>
              , open since July. The pin can go when this prints a <code className="font-mono">cp315</code> wheel:
            </p>
            <pre className="mt-2 rounded border border-ink/15 bg-cream p-3 font-mono text-[12px] break-all whitespace-pre-wrap">
              <code>pip download google-re2 --no-deps --only-binary=:all: --python-version 3.15 --platform macosx_14_0_arm64 -d /tmp/re2</code>
            </pre>
            <p className="mt-2">
              Today it finds none. Removing it is the one-line revert of the diff above.
            </p>
            <p className="mt-3">
              Existing installs aren&apos;t touched: the upgrade branch of install.sh runs <code className="font-mono">uv tool upgrade</code>,
              which keeps each env&apos;s Python.
            </p>
            <p className="mt-3 text-sm text-muted">
              Not tested: Linux with 3.15 as the newest Python. github.com/imbue-ai/mngr is a mirror of your internal repo, so this is a branch to copy, not a PR.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/15 bg-sage">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm">
          Unofficial demo by Cheryl Aurelia: not affiliated with Imbue. mngr is Imbue&apos;s open-source project (MIT).
        </div>
      </footer>
    </>
  );
}
