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
  const prose = text.replace(/`[\s\S]*?`/g, "").replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "");
  assert.doesNotMatch(prose, /\/20(?!\d)/, `${label} n/20 in prose`);
  assert.doesNotMatch(prose, /of 20/i, `${label} of 20 in prose`);
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
    if (item.sampleLabel === "Captured output") {
      assert.ok((dialog.match(/Captured output/g) || []).length >= 3, item.id);
      assert.doesNotMatch(dialog, /gemini-/);
      assert.doesNotMatch(dialog, /pip install anubys/i);
      assert.doesNotMatch(dialog, /anubys-home|\/home\/|\/Users\//);
    } else {
      assert.match(dialog, /Illustrative/);
      assert.match(dialog, /class="example-tag"/);
      assert.ok((dialog.match(/Illustrative/g) || []).length >= 3, item.id);
    }
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
  assert.match(retail.samples.commands, /harness gates /);
  assert.doesNotMatch(retail.samples.commands, /python -m harness/);
  assert.match(retail.samples.commands, /convert-tau-retail/);
  assert.doesNotMatch(retail.samples.commands, /harness gate --/);
  assert.match(renderDialogHtml(retail), /No suite verdict/);
  assert.match(renderDialogHtml(retail), /All 78 built suite scenarios/);
  assert.match(renderDialogHtml(retail), /Straight copy/);
  assert.match(renderDialogHtml(retail), /Rewritten/);

  const merge = board("candidate-merge");
  assert.match(merge.samples.commands, /harness gate --baseline runs\/baseline --candidate runs\/candidate --rollouts 5 --json runs\/verdict\.json/);
  assert.doesNotMatch(merge.samples.output, /model_version=/);
  assert.match(merge.samples.results, /"verdict": "pass"/);
  assert.match(merge.samples.pipeline, /ci_lower: -0\.027169850823/);
  assert.match(merge.samples.pipeline, /ci_upper: 0\.023185787078/);
  assert.match(merge.samples.results, /"lower": -0\.0272, "upper": 0\.0232/);
  assert.match(merge.verdict.why, /at 500 counted rollouts per arm/);
  assert.match(merge.samples.resultsCaption, /excerpt/);
  assert.match(merge.samples.pipelineCaption, /excerpt/);
  assert.match(renderDialogHtml(merge), /Example pipeline step/);
  assert.match(renderDialogHtml(merge), /Only Pass exits 0/);
  assert.match(renderDialogHtml(merge), />Bad input \(not a verdict\)</);

  const interval = board("interval-crosses");
  assert.equal(interval.verdict.display, "Insufficient evidence");
  assert.equal(interval.verdict.exit, 3);
  assert.doesNotMatch(interval.samples.output, /model_version=/);
  assert.match(interval.samples.results, /"verdict": "insufficient_evidence"/);
  assert.doesNotMatch(interval.samples.results, /diagnostics/);
  assert.equal("diagnostics" in interval.samples, false);
  assert.match(interval.samples.pipeline, /ci_lower: -0\.0988344439284/);
  assert.match(interval.samples.pipeline, /ci_upper: 0\.0596187576539/);
  assert.match(interval.samples.results, /"lower": -0\.0988, "upper": 0\.0596/);
  assert.equal(interval.samples.resultsCaption, "Gate JSON excerpt, rounded for display");
  const intervalDialog = renderDialogHtml(interval);
  assert.doesNotMatch(intervalDialog, /Diagnostic rows/);
  assert.doesNotMatch(intervalDialog, /acme\.return\.003|acme\.cancel\.001|-0\.9604|-0\.2652/);
  assert.match(intervalDialog, /Example pipeline step/);
  assert.match(intervalDialog, /crosses the minus 5 point margin/);
  assert.match(intervalDialog, /diagnostics only/);
  assert.match(intervalDialog, /about minus 9\.9 points to plus 6\.0 points/);
  assert.match(intervalDialog, /from -9\.9 points to 6 points/);
  assert.match(intervalDialog, /Even a perfectly clean small run lands here\./);

  const misses = board("environment-misses");
  assert.equal(misses.verdict.display, "Invalid run");
  assert.equal(misses.verdict.exit, 4);
  assert.match(misses.samples.output, /timeout=3/);
  assert.match(misses.samples.output, /model=<candidate-model> model_version=<model-version>/);
  assert.match(misses.samples.commands, /--json gate\.json/);
  assert.match(misses.samples.results, /"verdict": "invalid_run"/);
  assert.match(misses.samples.results, /"difference": null/);
  assert.match(misses.samples.results, /"difference_ci": null/);
  assert.doesNotMatch(misses.samples.results, /environment_misses|diagnostics/);
  assert.match(misses.samples.pipeline, /3 of 20/);
  assert.match(misses.samples.pipeline, /3\/20/);
  assert.match(misses.samples.pipeline, /more than 1\/20/);
  assert.equal(misses.samples.resultsCaption, "Gate JSON excerpt, rounded for display");
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

test("captured boards keep the real logs, and every board uses harness", () => {
  const install = board("prove-install");
  assert.match(install.samples.output, /Successfully installed anubys-0\.0\.1/);
  assert.match(install.samples.commands, /anubys-0\.0\.1-py3-none-any\.whl/);
  assert.match(install.samples.commands, /^\.anubys-build\/bin\/python -m build --outdir dist$/m);
  assert.match(install.samples.commands, /export PATH="\$PWD\/\.anubys-prove\/bin:\$\{PATH\}"/);
  assert.doesNotMatch(install.samples.commands, /HOME=/);
  assert.match(install.samples.commands, /<model-version>/);
  assert.doesNotMatch(install.samples.commands, /gemini-/);
  const installDialog = renderDialogHtml(install);
  assert.equal((installDialog.match(/Model name redacted\. Use your configured model\./g) || []).length, 3);
  const cheapDialog = renderDialogHtml(board("cheap-pull-requests"));
  assert.match(cheapDialog, /Model name redacted\. Use your configured model\./);
  const spendDialog = renderDialogHtml(board("spend-cap"));
  assert.match(spendDialog, /Model name redacted\. Use your configured model\./);
  assert.match(renderDialogHtml(install), /Wheel anubys-0\.0\.1/);
  assert.match(install.samples.results, /total_cost_usd=0/);
  assert.match(install.samples.results, /pass=1/);
  assert.doesNotMatch(install.samples.results, /model_version=/);

  const cheap = board("cheap-pull-requests");
  assert.match(cheap.samples.output, /error: --record is only for live mode/);
  assert.match(cheap.samples.commands, /--record/);
  assert.match(renderDialogHtml(cheap), /Exit code 2/);

  const spend = board("spend-cap");
  assert.match(spend.samples.commands, /\.anubys-prove\/bin\/python scripts\/check_monthly_spend\.py/);
  assert.match(spend.samples.commands, /\.anubys-prove\/bin\/harness validate suites\/tau_retail\/examples/);
  assert.match(spend.samples.output, /Refusing to start a live run\./);
  assert.doesNotMatch(spend.samples.output, /^error:/m);
  assert.match(spend.samples.example, /^error: this month's logged spend/);
  assert.match(renderDialogHtml(spend), /does not add an <code>error:<\/code> prefix/);

  const logs = board("two-spend-logs");
  assert.match(logs.samples.commands, /\.anubys-prove\/bin\/python scripts\/check_monthly_spend\.py/);
  assert.match(logs.samples.output, /month_total_usd=21\.00/);
  assert.match(logs.samples.output, /\$21\.00, under the \$38 cap/);
  assert.match(logs.samples.results, /~\/\.anubys\/spend_log\.jsonl/);
  assert.match(logs.samples.results, /live-spend-rows|live_spend_rows\.py restore/);

  const source = read("js/scenarios-data.js");
  assert.doesNotMatch(source, /python -m harness/);
  assert.doesNotMatch(source, /\/agent\/repos/);
  assert.doesNotMatch(source, /\/tmp\//);
  assert.match(logs.samples.commands, /# merge step: live_spend_rows\.restore\(\) called in-process with two local logs \(no GitHub call\)/);
  assert.match(logs.samples.results, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.equal(spend.cardNote, "The next live rollout doesn't start.");
  for (const id of ["prove-install", "cheap-pull-requests", "spend-cap", "two-spend-logs"]) {
    assert.equal(board(id).sampleLabel, "Captured output");
    assert.equal(board(id).sampleExample, false);
  }
});

test("scenarios data and the rendered page do not name a Gemini model version", () => {
  const banned = [/gemini-\d/i, /\d\.\d-flash/i];
  const data = read("js/scenarios-data.js");
  const page = read("scenarios/index.html");
  const rendered = [
    data,
    page,
    renderGridHtml(),
    ...SCENARIOS.map((item) => renderDialogHtml(item)),
  ].join("\n");
  for (const pattern of banned) assert.doesNotMatch(rendered, pattern);
  assert.match(data, /gemini_pricing\.yaml/);
  assert.match(board("environment-misses").samples.output, /model_version=<model-version>/);
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
  assert.match(page, /Eight situations you will hit running Anubys, and what each verdict tells you\./);
  assert.doesNotMatch(page, /placeholder/i);
  assert.doesNotMatch(page, /data file/i);
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
