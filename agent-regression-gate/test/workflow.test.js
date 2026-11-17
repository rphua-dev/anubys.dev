import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BAD_INPUT_EXIT,
  NARROW_MAX,
  VERDICT_CHOICES,
  WORKFLOW_STEPS,
  announceLive,
  clearPreview,
  createWorkflowState,
  pathProgress,
  pinStep,
  playLabel,
  previewStep,
  renderWorkflowHtml,
  selectVerdict,
  shownStepIndex,
  stepOnce,
  tickPlay,
  togglePlay,
  validateWorkflow,
  verdictById,
  workflowIndexFromKey,
  workflowMotion,
} from "../js/workflow.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("workflow copy, exit codes, and artifacts stay inside the v0.1 rules", () => {
  assert.deepEqual(validateWorkflow(), []);
  const html = renderWorkflowHtml();
  const banned = [
    [/\u2014/, "em dash"],
    [/\u2013/, "en dash"],
    [/\bFail\b/, "Fail"],
    [/p95/i, "p95"],
    [/gemini-/i, "model version"],
    [/hard stop/i, "hard stop"],
    [/pip install anubys/i, "pip install"],
    [/\d+\/20\b/, "n/20"],
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "email"],
    [/Wald|Agresti/i, "interval method"],
    [/Bad args/, "Bad args"],
    [/aria-pressed/, "aria-pressed"],
    [/planned_rollouts|completed_rollouts/, "rollout count"],
  ];
  for (const [pattern, name] of banned) assert.doesNotMatch(html, pattern, name);
  assert.doesNotMatch(html.replaceAll("fail the CI job by default", "").replaceAll("fails the CI job by default", ""), /\bfail\b/);
  assert.deepEqual(WORKFLOW_STEPS.map((step) => step.name), [
    "Pull request",
    "CI job",
    "Rollouts",
    "Stats gate",
    "Verdict",
    "Merge",
  ]);
  assert.equal(BAD_INPUT_EXIT, 2);
  assert.deepEqual(
    VERDICT_CHOICES.map((choice) => [choice.label, choice.exitCode, choice.merge]),
    [
      ["Pass", 0, "allowed"],
      ["Block", 1, "blocked"],
      ["Insufficient evidence", 3, "held"],
      ["Invalid run", 4, "held"],
    ],
  );
  assert.equal(verdictById("missing").label, "Pass");
  assert.equal(NARROW_MAX, 720);
});

test("the diagram renders six tabs, four verdicts, and the sample artifacts", () => {
  const html = renderWorkflowHtml();
  assert.equal((html.match(/role="tablist"/g) || []).length, 2);
  assert.equal((html.match(/role="tab"/g) || []).length, 10);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 10);
  assert.match(html, /aria-label="Harness workflow"/);
  assert.match(html, /aria-label="Example verdicts"/);
  assert.match(html, /Play the run/);
  assert.match(html, /Orange traces the run/);
  assert.match(html, /run_summary\.json/);
  assert.match(html, /total_cost_usd/);
  assert.match(html, /1\.25/);
  assert.match(html, /CLI summary/);
  assert.match(html, /total_cost_usd=1\.25 …/);
  assert.doesNotMatch(html, /completed_rollouts 40/);
  assert.match(html, /README workflow snippet/);
  assert.match(html, /A packaged Action is v0\.2\./);
  assert.match(html, /Bad input/);
  assert.match(html, /bad flags, a missing run directory, or baseline and candidate that don't cover the same scenarios/);
  assert.match(html, /A scenario mismatch exits 2 and is not an Invalid run\./);
  assert.match(html, /It is not a verdict\./);
  assert.match(html, /Block is the only verdict that says the candidate is clearly worse\./);
  assert.match(html, /Only Pass exits 0/);
  assert.match(html, /Exit codes 1, 3, and 4 all fail the CI job by default/);
  assert.match(html, /illustrative, pending real A\/A and Block results/);
  assert.match(html, /id="run-live" aria-live="polite"/);
  assert.match(html, /id="run-status">/);
  assert.doesNotMatch(html, /id="run-status"[^>]*aria-live/);
  assert.match(html, /class="run-name">Merge</);
  assert.match(html, /data-verdict="block"/);
  assert.equal((html.match(/class="example-tag"/g) || []).length >= 6, true);
  const summaryAt = html.indexOf("run_summary.json");
  const summary = html.slice(summaryAt, summaryAt + 700);
  assert.match(summary, /Example/);
  assert.match(summary, /1\.25/);
  for (const choice of VERDICT_CHOICES) {
    assert.ok(html.includes(`>${choice.label}<`) || html.includes(`>${choice.label}</p>`), choice.label);
    assert.ok(html.includes(`Exit code</dt><dd>${choice.exitCode}</dd>`), choice.id);
  }
});

test("the live region speaks on pause or finish, not on an animation step", () => {
  const start = createWorkflowState();
  assert.equal(announceLive(undefined, start), null);
  assert.equal(announceLive("tick", tickPlay(togglePlay(start))), null);
  const stepped = stepOnce(createWorkflowState({ reduced: true }));
  assert.equal(announceLive("step", stepped), "Step 2 of 6. CI job.");
  const paused = togglePlay(togglePlay(start));
  assert.equal(paused.playing, false);
  assert.equal(announceLive("pause", paused), "Paused. Step 1 of 6. Pull request.");
  let state = togglePlay(start);
  while (state.playing) state = tickPlay(state);
  assert.equal(state.index, 5);
  assert.equal(announceLive("finish", state), "Finished. Step 6 of 6. Merge.");
});

test("play walks an example run and reduced motion steps without a timer", () => {
  let state = createWorkflowState();
  assert.equal(playLabel(state), "Play the run");
  assert.equal(pathProgress(0), 0);
  assert.equal(workflowMotion(false).animate, true);
  state = togglePlay(state);
  assert.equal(state.playing, true);
  assert.equal(state.index, 0);
  assert.equal(playLabel(state), "Pause");
  for (let index = 1; index <= 5; index += 1) {
    state = tickPlay(state);
    assert.equal(state.index, index);
    assert.equal(state.playing, index < 5);
  }
  assert.equal(pathProgress(state.index), 1);
  assert.equal(playLabel(state), "Replay");
  state = togglePlay(state);
  assert.equal(state.index, 0);
  assert.equal(state.playing, true);

  const reduced = createWorkflowState({ reduced: true });
  assert.equal(workflowMotion(true).animate, false);
  assert.equal(workflowMotion(true).timer, false);
  assert.equal(playLabel(reduced), "Next step");
  const once = stepOnce(reduced);
  assert.equal(once.index, 1);
  assert.equal(once.playing, false);
  assert.equal(playLabel(once), "Next step");
});

test("hover previews a step, and a click pins it", () => {
  let state = pinStep(togglePlay(createWorkflowState()), 1);
  assert.equal(state.playing, false);
  assert.equal(state.index, 1);
  state = previewStep(state, 4);
  assert.equal(state.index, 1);
  assert.equal(shownStepIndex(state), 4);
  assert.equal(pathProgress(shownStepIndex(state)), 0.8);
  state = clearPreview(state);
  assert.equal(shownStepIndex(state), 1);
  state = selectVerdict(state, "block");
  assert.equal(state.verdict, "block");
  assert.equal(verdictById(state.verdict).mergeLabel, "Blocked");
  assert.equal(workflowIndexFromKey("ArrowRight", 1, 6), 2);
  assert.equal(workflowIndexFromKey("ArrowLeft", 0, 6), 0);
  assert.equal(workflowIndexFromKey("Home", 4, 6), 0);
  assert.equal(workflowIndexFromKey("End", 1, 6), 5);
  assert.equal(workflowIndexFromKey("Enter", 1, 6), null);
});

test("gate and results copy match the pooled gap and the sample sentence", () => {
  const gate = read("gate/index.html");
  const results = read("results/index.html");
  const pooled = "Rollouts are pooled across scenarios within each arm, and the gap is candidate pass rate minus baseline pass rate.";
  assert.ok(gate.includes(pooled));
  assert.doesNotMatch(gate, /unweighted mean of per-scenario gaps|Paired comparison|Each one counts once/);
  assert.doesNotMatch(gate, /Wald|Agresti/);
  assert.match(gate, /response model version that is missing or doesn't match the expected one/);
  assert.doesNotMatch(gate, /model version mismatch between rollouts/);
  assert.doesNotMatch(gate, /hash mismatch makes the run invalid|mismatch invalidates the run|hash invalidates the run/);
  assert.match(gate, /harness validate/);
  assert.match(gate, /exit 1/);
  assert.match(gate, /arm with zero counted rollouts/);
  assert.match(gate, /are not an Invalid run/);
  const scenarios = read("docs/guides/scenarios/index.html");
  assert.match(scenarios, /harness validate/);
  assert.match(scenarios, /exit 1/);
  assert.doesNotMatch(scenarios, /makes the run invalid/);
  assert.match(results, /Pass rates in that file are <span class="example-tag">Example<\/span> figures from the bundled sample\./);
  assert.doesNotMatch(results, /Pass rates in that sample are numbers/);
});

test("the home page mounts the diagram above the why section", () => {
  const home = read("index.html");
  const css = read("css/site.css");
  const main = read("js/main.js");
  assert.ok(home.indexOf('id="workflow"') > 0);
  assert.ok(home.indexOf('id="workflow"') < home.indexOf('id="why"'));
  assert.match(home, /id="workflow-title">Where the harness sits\./);
  assert.match(home, /id="workflow-root"/);
  assert.match(home, /README workflow snippet/);
  assert.match(home, /href="docs\/reference\/ci\/">More details/);
  assert.match(main, /renderWorkflowHtml/);
  assert.match(main, /bindWorkflow/);
  const diagram = css.slice(css.indexOf("/* workflow-diagram */"));
  assert.ok(diagram.length > 40);
  assert.match(diagram, /@media \(max-width:\s*720px\)/);
  assert.match(diagram, /@media \(min-width:\s*721px\)/);
  assert.match(diagram, /grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(diagram, /prefers-reduced-motion:\s*reduce/);
  assert.match(diagram, /animation:\s*none !important/);
  assert.match(diagram, /\.verdict-pick\[data-verdict="block"\][\s\S]*box-shadow:\s*var\(--block-glow\)/);
  assert.equal(diagram.includes('.verdict-pick[data-verdict="pass"]'), false);
  assert.equal(diagram.includes('.verdict-pick[data-verdict="insufficient"]'), false);
  assert.equal(diagram.includes('.verdict-pick[data-verdict="invalid"]'), false);
  assert.match(diagram, /#ff7a1a/);
});
