import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { findRun, installed, parseRunData, scriptVersion } from "./runs.ts";

const base = {
  arm: "a",
  setup: "homebrew",
  script: "https://raw.githubusercontent.com/imbue-ai/mngr/main/scripts/install.sh",
  startedAt: "2026-11-18T23:48:16Z",
  installExit: 0,
  pythonOnPath: "Python 3.15.2",
  mngrVersion: "mngr 0.3.1",
  mngrListExit: 0,
  toolPython: "Python 3.12.16",
  errors: [],
};

const parse = (runs: object[]) => parseRunData(JSON.stringify({ runs, excerpts: {} }));

test("installed needs exit 0, a version and a working mngr list", () => {
  const [ok, failedScript, noBinary, listFails] = parse([
    base,
    { ...base, arm: "b", installExit: 1 },
    { ...base, arm: "c", mngrVersion: null },
    { ...base, arm: "d", mngrListExit: 127 },
  ]).runs;

  assert.equal(installed(ok), true);
  assert.equal(installed(failedScript), false);
  assert.equal(installed(noBinary), false);
  assert.equal(installed(listFails), false);
});

test("rejects runs with an unknown setup or missing exit codes", () => {
  assert.throws(() => parse([{ ...base, setup: "linux" }]), /unknown setup/);
  assert.throws(() => parse([{ ...base, installExit: "1" }]), /exit codes/);
  assert.throws(() => parse([{ ...base, script: "" }]), /missing/);
});

test("findRun throws for a missing arm and scriptVersion tells main, fix and range apart", () => {
  const fork = "https://raw.githubusercontent.com/x/mngr/abc123/scripts/install.sh";
  const data = parse([base, { ...base, arm: "f", script: fork }, { ...base, arm: "range-f", script: fork }]);

  assert.throws(() => findRun(data, "nope"), /no run nope/);
  assert.equal(scriptVersion(findRun(data, "a")), "main");
  assert.equal(scriptVersion(findRun(data, "f")), "fix");
  assert.equal(scriptVersion(findRun(data, "range-f")), "range");
});

test("the recorded runs show the failure only on Homebrew without the fix", () => {
  const data = parseRunData(readFileSync(new URL("../data/runs.json", import.meta.url), "utf8"));

  for (const run of data.runs) {
    const expectFailure = run.setup === "homebrew" && scriptVersion(run) === "main";

    assert.equal(installed(run), !expectFailure, run.arm);
  }
});

test("the 3.12 pin leaves the stock Mac on the Python it already got", () => {
  const data = parseRunData(readFileSync(new URL("../data/runs.json", import.meta.url), "utf8"));

  assert.equal(findRun(data, "stock-fix").toolPython, findRun(data, "stock-main").toolPython);
  assert.notEqual(findRun(data, "range-stock-fix").toolPython, findRun(data, "stock-main").toolPython);
});
