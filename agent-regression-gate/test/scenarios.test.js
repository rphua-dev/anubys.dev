import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SCENARIOS } from "../js/scenarios-data.js";
import {
  DIALOG_ATTRS,
  SAMPLE_TABS,
  createScenarioState,
  cycleFocusIndex,
  nextTab,
  reduceScenario,
  renderDialogHtml,
  renderGridHtml,
  renderTeaserHtml,
  validateScenarios,
} from "../js/scenarios.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function board(id) {
  return SCENARIOS.find((item) => item.id === id);
}

function assertNoIntervalMethod(text, label) {
  for (const line of text.split("\n")) {
    if (/provenance\.method\s*:/.test(line)) continue;
    if (/^\s*method:\s*(rewritten|tau_bench_straight)\s*$/.test(line)) continue;
    assert.doesNotMatch(line, /method\s*:/, `${label} method: ${line.trim()}`);
    assert.doesNotMatch(line, /"method"/, `${label} method field`);
  }
  assert.doesNotMatch(text, /wald_unpooled|agresti/i, `${label} interval method`);
  assert.doesNotMatch(text, /harness gate base\//, `${label} positional gate`);
}

function assertBanned(text, label) {
  assert.doesNotMatch(text, /\bFail\b/, `${label} Fail verdict`);
  assert.doesNotMatch(text, /fail verdict/i, `${label} fail verdict`);
  assert.doesNotMatch(text, /hard stop/i, `${label} hard stop`);
  assert.doesNotMatch(text, /\u2014/, `${label} em dash`);
  assert.doesNotMatch(text, /pip install anubys/i, `${label} pip install anubys`);
  assert.doesNotMatch(text, /p95/i, `${label} p95`);
  assert.doesNotMatch(text, /show_verdict\.py/, `${label} show_verdict.py`);
  assert.doesNotMatch(text, /verdicts\.overall/, `${label} verdicts.overall`);
  assert.doesNotMatch(text, /results\.json/, `${label} results.json`);
  assert.doesNotMatch(text, /runner exits 0/i, `${label} runner exits 0`);
  assert.doesNotMatch(text, /preliminary/i, `${label} preliminary`);
  assert.doesNotMatch(text, /\/20(?!\d)/, `${label} n/20`);
  assert.doesNotMatch(text, /of 20/i, `${label} of 20`);
  assert.doesNotMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, `${label} email`);
  assertNoIntervalMethod(text, label);
}

test("the data file has eight boards and the required fields", () => {
  assert.deepEqual(validateScenarios(), []);
  assert.deepEqual(SCENARIOS.map((item) => item.id), [
    "prove-install",
    "cheap-pull-requests",
    "new-retail-task",
    "candidate-merge",
    "interval-crosses",
    "environment-misses",
    "spend-cap",
    "two-spend-logs",
  ]);
  assert.deepEqual(SAMPLE_TABS.map((tab) => tab.label), ["Commands", "Output", "Results excerpt"]);
  for (const item of SCENARIOS) {
    assert.equal(typeof item.samples.commands, "string");
    assert.equal(typeof item.samples.output, "string");
    assert.equal(typeof item.samples.results, "string");
    assert.ok(item.verdict.why);
  }
});

test("eight boards render and the dialog exposes the work-sample tabs", () => {
  const grid = renderGridHtml();
  assert.equal((grid.match(/class="scenario-board"/g) || []).length, 8);
  assert.equal((grid.match(/<button type="button"/g) || []).length, 8);
  for (const item of SCENARIOS) {
    assert.ok(grid.includes(`id="${item.id}"`), item.id);
    assert.ok(grid.includes(`>${item.title}<`), item.title);
    const dialog = renderDialogHtml(item);
    assert.match(dialog, /role="tablist"/);
    assert.equal((dialog.match(/role="tab"/g) || []).length, 3);
    assert.equal((dialog.match(/role="tabpanel"/g) || []).length, 3);
    assert.match(dialog, /aria-selected="true"/);
    assert.match(dialog, /aria-selected="false"/);
    assert.match(dialog, /aria-controls="scenario-panel-commands"/);
    assert.match(dialog, /id="scenario-dialog-title"/);
    assert.match(dialog, /id="scenario-situation"/);
    assert.match(dialog, /Illustrative/);
    assert.match(dialog, /class="example-tag"/);
    assert.ok((dialog.match(/Illustrative/g) || []).length >= 3, item.id);
  }
  assert.equal(DIALOG_ATTRS.role, "dialog");
  assert.equal(DIALOG_ATTRS["aria-modal"], "true");
  assert.equal(DIALOG_ATTRS["aria-labelledby"], "scenario-dialog-title");
});

test("escape and backdrop close return focus to the board, and tabs cycle", () => {
  let state = reduceScenario(createScenarioState(), { type: "open", id: "candidate-merge" });
  assert.equal(state.openId, "candidate-merge");
  state = reduceScenario(state, { type: "escape" });
  assert.equal(state.openId, null);
  assert.equal(state.returnFocusId, "candidate-merge");

  state = reduceScenario(createScenarioState(), { type: "open", id: "environment-misses" });
  state = reduceScenario(state, { type: "backdrop" });
  assert.equal(state.returnFocusId, "environment-misses");
  assert.equal(state.openId, null);

  state = reduceScenario(createScenarioState(), { type: "open", id: "new-retail-task" });
  state = reduceScenario(state, { type: "tab", tab: "results" });
  assert.equal(state.tab, "results");
  state = reduceScenario(state, { type: "close" });
  assert.equal(state.returnFocusId, "new-retail-task");

  assert.equal(nextTab("commands", "ArrowRight"), "output");
  assert.equal(nextTab("output", "ArrowLeft"), "commands");
  assert.equal(nextTab("results", "ArrowRight"), "commands");
  assert.equal(nextTab("commands", "ArrowLeft"), "results");
  assert.equal(nextTab("output", "Home"), "commands");
  assert.equal(nextTab("output", "End"), "results");
  assert.equal(nextTab("commands", "Enter"), null);
  assert.equal(cycleFocusIndex(4, 3, false), 0);
  assert.equal(cycleFocusIndex(4, 0, true), 3);
  assert.equal(cycleFocusIndex(4, -1, false), 0);
  assert.equal(cycleFocusIndex(4, -1, true), 3);
});

test("boards 3 to 6 keep the gate command, the top-level verdict, and the run-log notes", () => {
  const retail = board("new-retail-task");
  assert.match(retail.samples.commands, /python -m harness gates /);
  assert.match(retail.samples.commands, /convert-tau-retail/);
  assert.doesNotMatch(retail.samples.commands, /harness gate --/);
  assert.match(renderDialogHtml(retail), /No suite verdict/);
  assert.match(renderDialogHtml(retail), /All 78 built suite scenarios/);
  assert.match(renderDialogHtml(retail), /Straight copy/);
  assert.match(renderDialogHtml(retail), /Rewritten/);

  const merge = board("candidate-merge");
  assert.match(merge.samples.commands, /harness gate --baseline runs\/baseline --candidate runs\/candidate --rollouts 5 --json runs\/verdict\.json/);
  assert.match(merge.samples.output, /model_version=2\.5-flash-lite-07-2026/);
  assert.match(merge.samples.output, /model_version=3\.5-flash-lite-07-2026/);
  assert.match(merge.samples.results, /"verdict": "pass"/);
  assert.match(renderDialogHtml(merge), /Example pipeline step/);
  assert.match(renderDialogHtml(merge), /Only Pass exits 0/);
  assert.match(renderDialogHtml(merge), />Bad input \(not a verdict\)</);

  const interval = board("interval-crosses");
  assert.equal(interval.verdict.display, "Insufficient evidence");
  assert.equal(interval.verdict.exit, 3);
  assert.match(interval.samples.results, /"verdict": "insufficient_evidence"/);
  assert.match(renderDialogHtml(interval), /Example pipeline step/);
  assert.match(renderDialogHtml(interval), /crosses the minus 5 point margin/);
  assert.match(renderDialogHtml(interval), /Diagnostic only/);

  const misses = board("environment-misses");
  assert.equal(misses.verdict.display, "Invalid run");
  assert.equal(misses.verdict.exit, 4);
  assert.match(misses.samples.output, /timeout=3/);
  assert.match(misses.samples.output, /model_version=3\.5-flash-lite-07-2026/);
  assert.match(misses.samples.results, /"verdict": "invalid_run"/);
  assert.doesNotMatch(misses.samples.results, /difference_ci/);
  const dialog = renderDialogHtml(misses);
  assert.match(dialog, /Example pipeline step/);
  assert.match(dialog, /timeout=3 counts infrastructure timeouts \(environment misses\), not agent timeouts\. Agent timeouts count as task failures\./);
  assert.match(dialog, /This result does not say the agent got worse\./);
  assert.match(renderGridHtml(), /timeout=3 is an infrastructure miss, not an agent timeout\./);
  assert.match(dialog, /1 in 20/);

  for (const id of ["candidate-merge", "interval-crosses", "environment-misses"]) {
    const item = board(id);
    assert.match(item.samples.commands, /harness gate --baseline /);
    assert.match(item.samples.commands, /--candidate /);
    assert.match(item.samples.results, /"verdict":/);
    assert.doesNotMatch(item.samples.pipeline, /^\s*method:/m);
    assert.doesNotMatch(item.samples.results, /"method"/);
  }
});

test("new scenario files and rendered boards stay clear of banned copy", () => {
  const files = ["js/scenarios-data.js", "js/scenarios.js", "scenarios/index.html"];
  for (const rel of files) assertBanned(read(rel), rel);
  for (const item of SCENARIOS) {
    assertBanned(renderDialogHtml(item), item.id);
    assertBanned(renderGridHtml([item]), `${item.id} card`);
  }
  assertBanned(renderTeaserHtml(), "teaser");
  const page = read("scenarios/index.html");
  assert.match(page, /id="scenarios-root"/);
  assert.match(page, /id="scenarios-dialog"/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /aria-labelledby="scenario-dialog-title"/);
  const home = read("index.html");
  assert.match(home, /id="scenarios-teaser"/);
  assert.match(home, /href="scenarios\/"/);
  const nav = home.slice(home.indexOf('id="nav-menu"'), home.indexOf("</nav>"));
  assert.match(nav, /href="scenarios\/">Scenarios<\/a>/);
});

test("every page links Scenarios, and the grid is 1, 2, then 4 columns", () => {
  function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "test") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (entry.name.endsWith(".html")) out.push(full);
    }
    return out;
  }
  const pages = walk(root);
  assert.ok(pages.length >= 24);
  for (const file of pages) {
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, />Scenarios<\/a>/, path.relative(root, file));
  }
  const current = read("scenarios/index.html");
  assert.match(current, /href="\.\/" aria-current="page">Scenarios<\/a>/);
  const guide = read("docs/guides/scenarios/index.html");
  const primary = guide.slice(guide.indexOf('id="nav-menu"'), guide.indexOf("</nav>"));
  assert.match(primary, /href="\.\.\/\.\.\/\.\.\/scenarios\/">Scenarios<\/a>/);
  assert.doesNotMatch(primary, /scenarios\/" aria-current="page"/);

  const css = read("css/site.css");
  assert.match(css, /\.scenario-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /@media \(min-width: 720px\)\s*\{[\s\S]*?\.scenario-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(min-width: 1100px\)\s*\{[\s\S]*?\.scenario-grid\s*\{\s*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.scenario-board[\s\S]*animation:\s*none/);
  assert.match(css, /\.scenario-dialog \.verdict-card\[data-state="block"\]\s*\{[^}]*var\(--block-glow\)/);
  assert.match(css, /\.scenario-board\s*\{[^}]*box-shadow:\s*none/);
  assert.match(css, /\.scenario-tab\[aria-selected="true"\]\s*\{[^}]*color:\s*var\(--accent\)/);
});
