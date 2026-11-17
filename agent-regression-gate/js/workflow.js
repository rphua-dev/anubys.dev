/**
 * Home-page workflow diagram and verdict explorer.
 * Six steps, from the pull request to merge.
 * Verdicts are Pass, Block, Insufficient evidence, and Invalid run.
 * Likely regression is a spec flag, not computed in v0.1.
 * v0.1 CI is a README workflow snippet. A packaged Action is v0.2.
 * Exit codes: pass 0, block 1, bad input 2, insufficient 3, invalid 4.
 * Only Pass exits 0. Exit codes 1, 3, and 4 all fail the CI job by default.
 */

import { railIndexFromKey } from "./story.js";

export const PLAY_MS = 1100;
export const BAD_INPUT_EXIT = 2;
export const NARROW_MAX = 720;

const SNIPPET = `name: anubys
on:
  pull_request:
jobs:
  gate:
    name: Anubys
    runs-on: ubuntu-latest
# README CI workflow snippet for v0.1.
# A packaged Action is v0.2.`;

const SUMMARY = `{
  "schema_version": "1.1.0",
  "suite_id": "tau_retail",
  "total_cost_usd": "1.25"
}`;

export const WORKFLOW_STEPS = [
  {
    id: "pr",
    index: "01",
    name: "Pull request",
    title: "A developer opens a pull request",
    plain: "A developer opens a pull request. That is the start of the check. The harness is not on the live request path.",
    artifactLabel: "Pull request",
    example: true,
    kind: "code",
    artifact: "on: pull_request\n# Example\nhead: candidate\nbase: main",
  },
  {
    id: "ci",
    index: "02",
    name: "CI job",
    title: "CI runs the harness",
    plain: "The CI job is where the harness runs. v0.1 ships that job as a README workflow snippet, not a packaged GitHub Action. A packaged Action is v0.2.",
    artifactLabel: "README workflow snippet",
    example: false,
    kind: "code",
    artifact: SNIPPET,
    link: { href: "docs/reference/ci/#workflow", label: "Workflow snippet" },
  },
  {
    id: "rollouts",
    index: "03",
    name: "Rollouts",
    title: "Baseline vs candidate",
    plain: "The job runs the same scenario suite on two arms: the baseline already in use, and the candidate on the pull request. harness run writes run_summary.json plus a CLI summary. The dollar amount is the raw spend for that run. The figures are an Example, illustrative, pending real A/A and Block results.",
    artifactLabel: "run_summary.json",
    example: true,
    kind: "code",
    artifact: SUMMARY,
    cli: "total_cost_usd=1.25 …",
  },
  {
    id: "gate",
    index: "04",
    name: "Stats gate",
    title: "Non-inferiority, 5 pp margin",
    plain: "The stats gate is non-inferiority with a 5 pp margin. Pass if the 90% interval's lower bound is above −5 pp. Block if its upper bound is below −5 pp. Any other valid run is Insufficient evidence. An invalid run is not scored.",
    artifactLabel: "Decision rule",
    example: false,
    kind: "code",
    artifact: "Pass if the lower bound is above −5 pp.\nBlock if the upper bound is below −5 pp.\nOtherwise: Insufficient evidence.\nAn invalid run is not scored.",
    link: { href: "gate/", label: "Gate rule" },
  },
  {
    id: "verdict",
    index: "05",
    name: "Verdict",
    title: "One of four verdicts",
    plain: "The check names one verdict: Pass, Block, Insufficient evidence, or Invalid run. Likely regression, if mentioned, is a spec flag, not computed in v0.1. Bad input is an exit code for bad flags, a missing run directory, or baseline and candidate that don't cover the same scenarios. A scenario mismatch exits 2 and is not an Invalid run. It is not a verdict.",
    artifactLabel: "Exit codes",
    example: false,
    kind: "exits",
  },
  {
    id: "merge",
    index: "06",
    name: "Merge",
    title: "Merge is allowed or blocked",
    plain: "Only Pass exits 0, so the CI job passes and merge is allowed. Exit codes 1, 3, and 4 all fail the CI job by default. Block is the only verdict that says the candidate is clearly worse. Pick a verdict below to see what the team does next.",
    artifactLabel: "Check result",
    example: true,
    kind: "merge",
  },
];

export const VERDICT_CHOICES = [
  {
    id: "pass",
    label: "Pass",
    exitCode: 0,
    merge: "allowed",
    mergeLabel: "Allowed",
    check: "Example. Baseline 92% · Candidate 91% · Gap −1 pp. Lower bound −4 pp, above −5 pp.",
    next: "Exit 0. The CI job passes. Merge is allowed. The team can merge the pull request.",
  },
  {
    id: "block",
    label: "Block",
    exitCode: 1,
    merge: "blocked",
    mergeLabel: "Blocked",
    check: "Example. Baseline 92% · Candidate 70% · Gap −22 pp. Upper bound −14 pp, below −5 pp.",
    next: "Exit 1 fails the CI job by default. Block is the only verdict that says the candidate is clearly worse. The team revises the candidate and runs the check again.",
  },
  {
    id: "insufficient",
    label: "Insufficient evidence",
    exitCode: 3,
    merge: "held",
    mergeLabel: "Not cleared",
    check: "Example. Baseline 92% · Candidate 88% · Gap −4 pp. Interval −11 to +3 pp.",
    next: "Exit 3 fails the CI job by default. The pull request is not cleared. The team gathers more evidence before treating the change as ready to merge. Likely regression is a spec flag on this verdict, not computed in v0.1.",
  },
  {
    id: "invalid",
    label: "Invalid run",
    exitCode: 4,
    merge: "held",
    mergeLabel: "Not cleared",
    check: "Not scored.",
    next: "Exit 4 fails the CI job by default. The pull request is not cleared. The team fixes the run and starts again. An invalid run is not scored.",
  },
];

const EXIT_ROWS = [
  ["Pass", "0"],
  ["Block", "1"],
  ["Bad input", String(BAD_INPUT_EXIT)],
  ["Insufficient evidence", "3"],
  ["Invalid run", "4"],
];

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function workflowCopy() {
  const bits = [];
  for (const step of WORKFLOW_STEPS) {
    bits.push(step.name, step.title, step.plain, step.artifactLabel, step.artifact || "", step.cli || "", step.link?.label || "");
  }
  for (const choice of VERDICT_CHOICES) {
    bits.push(choice.label, choice.check, choice.next, choice.mergeLabel, `Exit ${choice.exitCode}`);
  }
  bits.push("Play the run", "Pause", "Next step", "Replay", "Orange traces the run.");
  return bits.join("\n");
}

export function validateWorkflow() {
  const errors = [];
  const text = `${workflowCopy()}\n${renderWorkflowHtml()}`;
  if (text.includes("\u2014") || text.includes("\u2013")) errors.push("dash");
  if (/export-replay|per-family|HTML report/i.test(text)) errors.push("later");
  if (/cost per|per verdict/i.test(text)) errors.push("derived cost");
  if (WORKFLOW_STEPS.length !== 6) errors.push("steps");
  if (WORKFLOW_STEPS.map((step) => step.id).join(",") !== "pr,ci,rollouts,gate,verdict,merge") errors.push("order");
  if (VERDICT_CHOICES.map((choice) => choice.label).join("|") !== "Pass|Block|Insufficient evidence|Invalid run") {
    errors.push("verdicts");
  }
  const exits = Object.fromEntries(VERDICT_CHOICES.map((choice) => [choice.id, choice.exitCode]));
  if (exits.pass !== 0 || exits.block !== 1 || exits.insufficient !== 3 || exits.invalid !== 4 || BAD_INPUT_EXIT !== 2) {
    errors.push("exits");
  }
  if (!text.includes("README workflow snippet")) errors.push("snippet");
  if (!text.includes("A packaged Action is v0.2.")) errors.push("action");
  if (!/non-inferiority/i.test(text) || !text.includes("5 pp")) errors.push("margin");
  if (!text.includes("run_summary.json") || !text.includes("total_cost_usd") || !text.includes("1.25")) errors.push("summary");
  if (!text.includes("CLI summary") || !text.includes("total_cost_usd=1.25 …")) errors.push("cli");
  if (/\b(planned_rollouts|completed_rollouts)\b/.test(text)) errors.push("rollout count");
  if (!text.includes("Likely regression") || !text.includes("not computed in v0.1")) errors.push("flag");
  if (!text.includes("Bad input")) errors.push("bad input");
  if (text.includes("Bad args")) errors.push("bad args");
  if (!text.includes("It is not a verdict.")) errors.push("not a verdict");
  if (!text.includes("Block is the only verdict that says the candidate is clearly worse.")) errors.push("block");
  if (!text.includes("Exit codes 1, 3, and 4 all fail the CI job by default.")) errors.push("ci exits");
  if (!/illustrative, pending real A\/A and Block results/.test(text)) errors.push("illustrative");
  if (/Wald|Agresti-Caffo|Agresti/.test(text)) errors.push("interval method");
  if (!text.includes('role="tablist"') || !text.includes('role="tab"') || !text.includes('role="tabpanel"')) errors.push("aria");
  return errors;
}

export function createWorkflowState({ reduced = false } = {}) {
  return {
    index: 0,
    preview: null,
    playing: false,
    verdict: "pass",
    reduced: Boolean(reduced),
  };
}

export function verdictById(id) {
  return VERDICT_CHOICES.find((choice) => choice.id === id) || VERDICT_CHOICES[0];
}

function clampIndex(index, count) {
  const n = Number.isFinite(index) ? index : 0;
  return Math.min(Math.max(count - 1, 0), Math.max(0, n));
}

export function shownStepIndex(state) {
  const count = WORKFLOW_STEPS.length;
  if (!state || state.preview == null) return clampIndex(state?.index, count);
  return clampIndex(state.preview, count);
}

export function pathProgress(index, count = WORKFLOW_STEPS.length) {
  if (count <= 1) return 0;
  return clampIndex(index, count) / (count - 1);
}

export function workflowMotion(reduced) {
  return { animate: !reduced, timer: !reduced };
}

export function workflowIndexFromKey(key, index, count) {
  return railIndexFromKey(key, index, count);
}

export function announceLive(reason, state) {
  const shown = shownStepIndex(state);
  const step = WORKFLOW_STEPS[shown];
  const place = `Step ${shown + 1} of ${WORKFLOW_STEPS.length}. ${step.name}.`;
  if (reason === "step") return place;
  if (reason === "pause") return `Paused. ${place}`;
  if (reason === "finish") return `Finished. ${place}`;
  return null;
}

export function playLabel(state) {
  const last = WORKFLOW_STEPS.length - 1;
  if (state.playing) return "Pause";
  if (state.index >= last) return "Replay";
  if (state.reduced) return "Next step";
  return "Play the run";
}

export function togglePlay(state) {
  if (state.playing) return { ...state, playing: false, preview: null };
  const last = WORKFLOW_STEPS.length - 1;
  return {
    ...state,
    playing: true,
    preview: null,
    index: state.index >= last ? 0 : state.index,
  };
}

export function tickPlay(state) {
  if (!state.playing) return state;
  const last = WORKFLOW_STEPS.length - 1;
  if (state.index >= last) return { ...state, playing: false, preview: null };
  const index = state.index + 1;
  return { ...state, index, preview: null, playing: index < last };
}

export function stepOnce(state) {
  const last = WORKFLOW_STEPS.length - 1;
  const index = state.index >= last ? 0 : state.index + 1;
  return { ...state, index, preview: null, playing: false };
}

export function pinStep(state, index) {
  return { ...state, index: clampIndex(index, WORKFLOW_STEPS.length), preview: null, playing: false };
}

export function previewStep(state, index) {
  return { ...state, preview: clampIndex(index, WORKFLOW_STEPS.length) };
}

export function clearPreview(state) {
  return { ...state, preview: null };
}

export function selectVerdict(state, id) {
  return { ...state, verdict: verdictById(id).id };
}

function exampleTag() {
  return '<span class="example-tag">Example</span>';
}

function codeArtifact(step) {
  const cli = step.cli
    ? `<p class="run-artifact-label">CLI summary ${exampleTag()}</p><pre tabindex="0"><code>${escapeHtml(step.cli)}</code></pre>`
    : "";
  return `<div class="run-artifact">
    <p class="run-artifact-label">${escapeHtml(step.artifactLabel)}${step.example ? ` ${exampleTag()}` : ""}</p>
    <pre tabindex="0"><code>${escapeHtml(step.artifact)}</code></pre>
    ${cli}
  </div>`;
}

function exitsArtifact(step) {
  const rows = EXIT_ROWS.map(([name, code]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(code)}</dd></div>`).join("");
  return `<div class="run-artifact">
    <p class="run-artifact-label">${escapeHtml(step.artifactLabel)}</p>
    <dl class="run-exits">${rows}</dl>
    <p class="fine">Bad input is an exit code for bad flags, a missing run directory, or baseline and candidate that don't cover the same scenarios. A scenario mismatch exits 2 and is not an Invalid run. It is not a verdict.</p>
  </div>`;
}

function mergeArtifact(step) {
  const lines = VERDICT_CHOICES.map((choice) => {
    const hidden = choice.id === "pass" ? "" : " hidden";
    return `<p class="run-merge-line" data-merge-line="${choice.id}"${hidden}>${exampleTag()} Anubys: ${escapeHtml(choice.label)}. Exit ${choice.exitCode}. Merge ${escapeHtml(choice.mergeLabel.toLowerCase())}.</p>`;
  }).join("");
  return `<div class="run-artifact">
    <p class="run-artifact-label">${escapeHtml(step.artifactLabel)} ${exampleTag()}</p>
    ${lines}
  </div>`;
}

function artifactFor(step) {
  if (step.kind === "exits") return exitsArtifact(step);
  if (step.kind === "merge") return mergeArtifact(step);
  return codeArtifact(step);
}

function stepButton(step, selected) {
  const outcome = step.id === "merge"
    ? `<span class="run-outcome" data-outcome="allowed">Allowed</span>`
    : "";
  return `<li class="run-stop${selected ? " is-current" : ""}" role="presentation">
    <button type="button" class="run-node" role="tab" id="run-tab-${step.id}" aria-controls="run-panel-${step.id}" aria-selected="${selected ? "true" : "false"}" tabindex="${selected ? "0" : "-1"}">
      <span class="run-mark" aria-hidden="true">${step.index}</span>
      <span class="run-label"><span class="run-name">${escapeHtml(step.name)}</span>${outcome}</span>
    </button>
  </li>`;
}

function stepPanel(step, shown) {
  const link = step.link
    ? `<p class="run-more"><a href="${escapeHtml(step.link.href)}">${escapeHtml(step.link.label)}</a></p>`
    : "";
  return `<div class="run-panel" role="tabpanel" id="run-panel-${step.id}" aria-labelledby="run-tab-${step.id}"${shown ? "" : " hidden"}>
    <div class="run-detail">
      <div>
        <p class="run-kicker">${step.index}</p>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.plain)}</p>
        ${link}
      </div>
      ${artifactFor(step)}
    </div>
  </div>`;
}

function verdictButton(choice, selected) {
  return `<button type="button" class="verdict-pick" role="tab" id="verdict-tab-${choice.id}" data-verdict="${choice.id}" aria-controls="verdict-panel-${choice.id}" aria-selected="${selected ? "true" : "false"}" tabindex="${selected ? "0" : "-1"}">${escapeHtml(choice.label)}</button>`;
}

function verdictPanel(choice, shown) {
  return `<div class="verdict-readout" role="tabpanel" id="verdict-panel-${choice.id}" data-verdict="${choice.id}" aria-labelledby="verdict-tab-${choice.id}"${shown ? "" : " hidden"}>
    <p class="verdict-readout-kicker">CI check ${exampleTag()}</p>
    <p class="verdict-readout-name">${escapeHtml(choice.label)}</p>
    <p>${escapeHtml(choice.check)}</p>
    <dl class="verdict-facts">
      <div><dt>Exit code</dt><dd>${choice.exitCode}</dd></div>
      <div><dt>Next</dt><dd>${escapeHtml(choice.next)}</dd></div>
    </dl>
  </div>`;
}

export function renderWorkflowHtml() {
  const steps = WORKFLOW_STEPS.map((step, index) => stepButton(step, index === 0)).join("");
  const panels = WORKFLOW_STEPS.map((step, index) => stepPanel(step, index === 0)).join("");
  const picks = VERDICT_CHOICES.map((choice, index) => verdictButton(choice, index === 0)).join("");
  const reads = VERDICT_CHOICES.map((choice, index) => verdictPanel(choice, index === 0)).join("");
  return `<div class="run">
    <div class="run-controls">
      <button type="button" class="btn btn-ghost run-play" aria-controls="run-steps">Play the run</button>
      <p class="run-legend"><i aria-hidden="true"></i>Orange traces the run.</p>
    </div>
    <p class="run-status" id="run-status">Step 1 of ${WORKFLOW_STEPS.length}. Pull request.</p>
    <p class="sr-only" id="run-live" aria-live="polite"></p>
    <div class="run-board" style="--run-progress:0">
      <ol class="run-steps" id="run-steps" role="tablist" aria-label="Harness workflow" aria-orientation="horizontal">
        ${steps}
      </ol>
    </div>
    <div class="run-panels">${panels}</div>
    <div class="verdict-explorer">
      <h3 id="verdict-explorer-title">What the check shows</h3>
      <p class="v-line">Four verdicts. Block is the only verdict that says the candidate is clearly worse. Only Pass exits 0. Exit codes 1, 3, and 4 all fail the CI job by default. The rates and intervals are Example figures, illustrative, pending real A/A and Block results.</p>
      <div class="verdict-picks" role="tablist" aria-label="Example verdicts" aria-orientation="horizontal">
        ${picks}
      </div>
      ${reads}
    </div>
  </div>`;
}

export function bindWorkflow(root, win = typeof window === "undefined" ? null : window) {
  if (!root || !win?.matchMedia) return () => {};
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let state = createWorkflowState({ reduced });
  const board = root.querySelector(".run-board");
  const tabs = [...root.querySelectorAll(".run-node")];
  const panels = [...root.querySelectorAll(".run-panel")];
  const stepList = root.querySelector(".run-steps");
  const play = root.querySelector(".run-play");
  const status = root.querySelector(".run-status");
  const live = root.querySelector("#run-live");
  const verdictTabs = [...root.querySelectorAll(".verdict-pick")];
  const verdictPanels = [...root.querySelectorAll(".verdict-readout")];
  const verdictList = root.querySelector(".verdict-picks");
  const outcome = root.querySelector(".run-outcome");
  let timer = 0;

  function paint(reason) {
    const shown = shownStepIndex(state);
    const verdict = verdictById(state.verdict);
    board?.style.setProperty("--run-progress", pathProgress(shown).toFixed(4));
    board?.classList.toggle("is-animating", workflowMotion(state.reduced).animate);
    tabs.forEach((tab, index) => {
      const stop = tab.closest(".run-stop");
      const selected = index === state.index;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      stop?.classList.toggle("is-current", index === shown);
      stop?.classList.toggle("is-reached", index < shown);
      stop?.classList.toggle("is-pinned", selected && index !== shown);
    });
    panels.forEach((panel, index) => {
      panel.hidden = index !== shown;
    });
    if (status) {
      const step = WORKFLOW_STEPS[shown];
      status.textContent = `Step ${shown + 1} of ${WORKFLOW_STEPS.length}. ${step.name}.`;
    }
    const announcement = announceLive(reason, state);
    if (live && announcement) live.textContent = announcement;
    if (play) {
      play.textContent = playLabel(state);
    }
    verdictTabs.forEach((tab) => {
      const on = tab.dataset.verdict === verdict.id;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    verdictPanels.forEach((panel) => {
      panel.hidden = panel.dataset.verdict !== verdict.id;
    });
    if (outcome) {
      outcome.dataset.outcome = verdict.merge;
      outcome.textContent = verdict.mergeLabel;
    }
    root.querySelectorAll("[data-merge-line]").forEach((line) => {
      line.hidden = line.dataset.mergeLine !== verdict.id;
    });
  }

  function stopTimer() {
    win.clearInterval(timer);
    timer = 0;
  }

  function arm() {
    stopTimer();
    if (!state.playing || state.preview != null || !workflowMotion(state.reduced).timer) return;
    timer = win.setInterval(() => {
      const wasPlaying = state.playing;
      state = tickPlay(state);
      const finished = wasPlaying && !state.playing;
      paint(finished ? "finish" : undefined);
      if (!state.playing) stopTimer();
    }, PLAY_MS);
  }

  function onStepKey(event, items, currentIndex, choose) {
    const next = workflowIndexFromKey(event.key, currentIndex, items.length);
    if (next == null) return;
    event.preventDefault();
    choose(next);
    items[next].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("pointerenter", () => {
      if (state.preview === index) return;
      state = previewStep(state, index);
      paint();
      arm();
    });
    tab.addEventListener("click", () => {
      state = pinStep(state, index);
      paint();
      arm();
    });
    tab.addEventListener("focus", () => {
      if (state.index === index && state.preview == null && !state.playing) return;
      state = pinStep(state, index);
      paint();
      arm();
    });
  });

  stepList?.addEventListener("pointerleave", () => {
    if (state.preview == null) return;
    state = clearPreview(state);
    paint();
    arm();
  });

  stepList?.addEventListener("keydown", (event) => {
    const current = tabs.findIndex((tab) => tab === win.document.activeElement);
    if (current < 0) return;
    onStepKey(event, tabs, current, (next) => {
      state = pinStep(state, next);
      paint();
      arm();
    });
  });

  play?.addEventListener("click", () => {
    const wasPlaying = state.playing;
    const reduced = state.reduced;
    state = reduced ? stepOnce(state) : togglePlay(state);
    const paused = !reduced && wasPlaying && !state.playing;
    paint(reduced ? "step" : paused ? "pause" : undefined);
    arm();
  });

  verdictTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state = selectVerdict(state, tab.dataset.verdict);
      paint();
    });
  });

  verdictList?.addEventListener("keydown", (event) => {
    const current = verdictTabs.findIndex((tab) => tab === win.document.activeElement);
    if (current < 0) return;
    onStepKey(event, verdictTabs, current, (next) => {
      state = selectVerdict(state, verdictTabs[next].dataset.verdict);
      paint();
    });
  });

  const narrow = win.matchMedia(`(max-width: ${NARROW_MAX}px)`);
  const orient = () => {
    const mode = narrow.matches ? "vertical" : "horizontal";
    stepList?.setAttribute("aria-orientation", mode);
    verdictList?.setAttribute("aria-orientation", mode);
  };
  orient();
  narrow.addEventListener?.("change", orient);

  paint();
  return () => {
    stopTimer();
    narrow.removeEventListener?.("change", orient);
  };
}
