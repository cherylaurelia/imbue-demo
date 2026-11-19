// Installer runs the page cites (data/runs.json, written from repro/logs/runs.jsonl by repro/repro.sh).

export interface InstallRun {
  arm: string;
  setup: "stock" | "homebrew";
  script: string;
  startedAt: string;
  installExit: number;
  pythonOnPath: string;
  mngrVersion: string | null;
  mngrListExit: number;
  toolPython: string | null;
  errors: string[];
}

export interface RunData {
  runs: InstallRun[];
  excerpts: Record<string, string[]>;
}

const SETUPS = new Set(["stock", "homebrew"]);

export function parseRunData(json: string): RunData {
  const data: RunData = JSON.parse(json);

  if (!Array.isArray(data.runs) || !(data.excerpts instanceof Object)) throw new Error("runs.json needs runs and excerpts");

  for (const run of data.runs) checkRun(run);

  for (const [arm, lines] of Object.entries(data.excerpts)) {
    if (!Array.isArray(lines)) throw new Error(`runs.json: excerpt ${arm} must be a list of lines`);
  }

  return data;
}

function checkRun(run: InstallRun): void {
  if (!run.arm || !run.script || !run.startedAt) throw new Error(`runs.json: run ${run.arm ?? "?"} is missing its arm, script or date`);

  if (!SETUPS.has(run.setup)) throw new Error(`runs.json: ${run.arm} has unknown setup ${run.setup}`);

  if (!Number.isInteger(run.installExit) || !Number.isInteger(run.mngrListExit)) throw new Error(`runs.json: ${run.arm} has no exit codes`);
}

// A run counts as installed only if the script exited 0 and the installed mngr answers both commands.
export function installed(run: InstallRun): boolean {
  return run.installExit === 0 && run.mngrVersion !== null && run.mngrListExit === 0;
}

export function findRun(data: RunData, arm: string): InstallRun {
  const run = data.runs.find((r) => r.arm === arm);

  if (run === undefined) throw new Error(`runs.json has no run ${arm}`);

  return run;
}

export type ScriptVersion = "main" | "fix" | "range";

// Which install.sh a run used: imbue-ai/mngr main, the fix commit (--python 3.12),
// or the rejected range variant (--python '>=3.12,<3.15'), whose arms are named range-*.
export function scriptVersion(run: InstallRun): ScriptVersion {
  if (run.script.includes("/imbue-ai/mngr/main/")) return "main";

  return run.arm.startsWith("range-") ? "range" : "fix";
}
