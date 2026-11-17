/**
 * Scenario board grid and dialog.
 * Content lives in scenarios-data.js. This module only renders and binds it.
 */

import { SAMPLE_TABS, SCENARIOS, VERDICT_NAMES } from "./scenarios-data.js";

export { SAMPLE_TABS, SCENARIOS, VERDICT_NAMES };

export const DIALOG_ATTRS = {
  role: "dialog",
  "aria-modal": "true",
  "aria-labelledby": "scenario-dialog-title",
  "aria-describedby": "scenario-situation",
};

const STATE_BY_NAME = {
  Pass: "pass",
  Block: "block",
  "Insufficient evidence": "insufficient",
  "Invalid run": "invalid",
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderRich(value) {
  return escapeHtml(value)
    .replaceAll("{example}", '<span class="example-tag">Example</span>')
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function verdictState(board) {
  return STATE_BY_NAME[board.verdict?.display] || "none";
}

export function createScenarioState() {
  return { openId: null, tab: "commands", returnFocusId: null };
}

export function reduceScenario(state, action) {
  if (action.type === "open" && action.id) {
    return { openId: action.id, tab: "commands", returnFocusId: action.id };
  }
  if (action.type === "close" || action.type === "escape" || action.type === "backdrop") {
    return { openId: null, tab: "commands", returnFocusId: state.openId };
  }
  if (action.type === "tab" && state.openId && SAMPLE_TABS.some((tab) => tab.id === action.tab)) {
    return { ...state, tab: action.tab };
  }
  return state;
}

export function nextTab(current, key) {
  const ids = SAMPLE_TABS.map((tab) => tab.id);
  const index = Math.max(0, ids.indexOf(current));
  if (key === "ArrowRight" || key === "ArrowDown") return ids[(index + 1) % ids.length];
  if (key === "ArrowLeft" || key === "ArrowUp") return ids[(index - 1 + ids.length) % ids.length];
  if (key === "Home") return ids[0];
  if (key === "End") return ids[ids.length - 1];
  return null;
}

export function cycleFocusIndex(count, index, shiftKey) {
  if (count < 1) return 0;
  if (index < 0) return shiftKey ? count - 1 : 0;
  if (shiftKey) return (index - 1 + count) % count;
  return (index + 1) % count;
}

export function validateScenarios(list = SCENARIOS) {
  const errors = [];
  if (list.length !== 8) errors.push(`expected 8 boards, found ${list.length}`);
  const ids = new Set();
  for (const board of list) {
    const id = board?.id || "(missing id)";
    if (!board?.id || ids.has(board.id)) errors.push(`${id} id`);
    ids.add(board?.id);
    for (const key of ["index", "title", "hook", "situation"]) {
      if (!String(board?.[key] || "").trim()) errors.push(`${id} ${key}`);
    }
    if (!Array.isArray(board?.steps) || board.steps.length === 0) errors.push(`${id} steps`);
    const samples = board?.samples || {};
    for (const key of ["commands", "output", "results"]) {
      if (!String(samples[key] || "").trim()) errors.push(`${id} samples.${key}`);
    }
    const verdict = board?.verdict;
    if (!verdict || !["gate", "command", "none"].includes(verdict.scope)) errors.push(`${id} scope`);
    if (!String(verdict?.why || "").trim()) errors.push(`${id} why`);
    if (verdict?.display != null && !VERDICT_NAMES.includes(verdict.display)) errors.push(`${id} display`);
    if (verdict?.scope === "gate") {
      if (!VERDICT_NAMES.includes(verdict.display)) errors.push(`${id} gate display`);
      if (![0, 1, 3, 4].includes(verdict.exit)) errors.push(`${id} gate exit`);
      if (verdict.display === "Pass" && verdict.exit !== 0) errors.push(`${id} pass must exit 0`);
      if (verdict.display !== "Pass" && verdict.exit === 0) errors.push(`${id} only pass exits 0`);
    }
    if (verdict?.scope === "none" && (verdict.display != null || verdict.exit != null)) {
      errors.push(`${id} none has no suite verdict`);
    }
    if (verdict?.scope === "command" && (verdict.display !== "Pass" || verdict.exit !== 0)) {
      errors.push(`${id} command outcome`);
    }
  }
  return errors;
}

function paragraphs(value) {
  return String(value ?? "")
    .split(/\n{2,}/)
    .filter((part) => part.trim())
    .map((part) => `<p>${renderRich(part.trim())}</p>`)
    .join("");
}

const MODEL_REDACTION = "Model name redacted. Use your configured model.";

function sampleBlock(text, { pipeline = false, caption = "", label = "Illustrative", example = true } = {}) {
  if (!text) return "";
  const heading = pipeline
    ? `<h3 class="scenario-pipeline">${escapeHtml(caption || "Example pipeline step")}</h3>`
    : caption
      ? `<h3 class="scenario-sample-caption">${escapeHtml(caption)}</h3>`
      : "";
  const flag = label ? `<span class="sample-flag">${escapeHtml(label)}</span>` : "";
  const exampleChip = example ? `<span class="example-tag">Example</span>` : "";
  const meta = [flag, exampleChip].filter(Boolean).join(" ");
  const redacted = label === "Captured output" && String(text).includes("<model-version>")
    ? `<p class="scenario-callout">${escapeHtml(MODEL_REDACTION)}</p>`
    : "";
  return `<div class="scenario-sample">${heading}${redacted}<p class="scenario-sample-meta">${meta}</p><pre class="scenario-pre" tabindex="0"><code>${escapeHtml(text)}</code></pre></div>`;
}

function sampleOpts(board, extra = {}) {
  return {
    label: board.sampleLabel || "Illustrative",
    example: board.sampleExample !== false,
    ...extra,
  };
}

function renderBoardHtml(board, index) {
  const state = verdictState(board);
  const label = board.verdict.display || "No suite verdict";
  const note = board.cardNote ? `<span class="scenario-card-note">${escapeHtml(board.cardNote)}</span>` : "";
  const flagLabel = board.sampleLabel || (board.placeholder ? "Illustrative" : "");
  const flag = flagLabel ? `<span class="sample-flag">${escapeHtml(flagLabel)}</span>` : "";
  return `<li><button type="button" class="scenario-board" id="${escapeHtml(board.id)}" data-scenario="${escapeHtml(board.id)}" data-verdict="${state}" style="--i:${index}" aria-haspopup="dialog" aria-controls="scenarios-dialog"><span class="scenario-index">${escapeHtml(board.index)}</span><span class="scenario-board-title">${escapeHtml(board.title)}</span><span class="scenario-board-hook">${escapeHtml(board.hook)}</span>${note}<span class="scenario-board-foot"><span class="scenario-chip" data-verdict="${state}">${escapeHtml(label)}</span>${flag}</span></button></li>`;
}

export function renderGridHtml(list = SCENARIOS) {
  return `<ol class="scenario-grid">${list.map(renderBoardHtml).join("")}</ol>`;
}

export function renderTeaserHtml(list = SCENARIOS, prefix = "scenarios/") {
  const items = list.map((board) => (
    `<li><a href="${escapeHtml(prefix)}#${escapeHtml(board.id)}">${escapeHtml(board.title)}</a></li>`
  )).join("");
  return `<ul class="use-tease">${items}</ul>`;
}

function renderVerdict(board) {
  const verdict = board.verdict;
  if (verdict.scope === "none" || verdict.display == null) {
    return `<article class="scenario-outcome"><header class="verdict-card-top"><h3>No suite verdict</h3></header><p>${renderRich(verdict.why)}</p></article>`;
  }
  const kicker = verdict.scope === "command" ? "Command outcome" : "Suite verdict";
  const exampleChip = board.sampleExample === false ? "" : `<span class="example-tag">Example</span>`;
  return `<article class="verdict-card" data-state="${verdictState(board)}"><header class="verdict-card-top"><p class="kicker">${kicker}</p>${exampleChip}</header><h3>${escapeHtml(verdict.display)}</h3><p class="verdict-gap"><span>Exit</span><b>${escapeHtml(verdict.exit)}</b></p></article><p class="scenario-why">${renderRich(verdict.why)}</p>`;
}

function renderCompare(compare) {
  if (!compare) return "";
  const column = (title, items) => (
    `<div class="scenario-compare-col"><h3>${escapeHtml(title)}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
  );
  return `<div class="scenario-compare">${column(compare.beforeTitle, compare.before)}${column(compare.afterTitle, compare.after)}</div>`;
}

function axisPct(value, min, max) {
  const span = max - min;
  if (!span) return 0;
  return Math.min(100, Math.max(0, ((value - min) / span) * 100));
}

function renderNumberline(line) {
  if (!line) return "";
  const start = axisPct(line.lower, line.min, line.max);
  const end = axisPct(line.upper, line.min, line.max);
  const margin = axisPct(line.margin, line.min, line.max);
  const label = `Example. The 90% interval runs from ${line.lower} points to ${line.upper} points and crosses the margin at ${line.margin} points.`;
  return `<figure class="scenario-line" aria-label="${escapeHtml(label)}"><figcaption><span class="example-tag">Example</span> ${escapeHtml(line.caption)}</figcaption><div class="scenario-line-track" aria-hidden="true"><i class="scenario-line-bar" style="left:${start.toFixed(2)}%;width:${Math.max(0, end - start).toFixed(2)}%"></i><b class="scenario-line-margin" style="left:${margin.toFixed(2)}%"><span>−5 pp</span></b></div></figure>`;
}

function renderMeters(meters) {
  if (!meters) return "";
  const cap = 1 / 20;
  const rows = meters.arms.map((arm) => {
    const rate = arm.scheduled ? arm.misses / arm.scheduled : 0;
    const fill = Math.min(100, (rate / meters.scale) * 100);
    const tick = Math.min(100, (cap / meters.scale) * 100);
    const over = rate > cap;
    const text = `${arm.misses} misses in ${arm.scheduled} scheduled`;
    return `<div class="scenario-meter-row"><div class="scenario-meter-label"><span>${escapeHtml(arm.name)}</span><b>${escapeHtml(text)}</b><em>${over ? "Over the line" : "On or under the line"}</em></div><div class="scenario-meter" aria-hidden="true"><i style="width:${fill.toFixed(2)}%"></i><s style="left:${tick.toFixed(2)}%"></s></div></div>`;
  }).join("");
  return `<figure class="scenario-meters"><figcaption><span class="example-tag">Example</span> Misses against scheduled rollouts. The tick is ${escapeHtml(meters.capLabel)}. Exactly on the tick still scores.</figcaption>${rows}</figure>`;
}

function renderExits(rows) {
  if (!rows?.length) return "";
  const body = rows.map((row) => {
    const name = row.verdict ? row.outcome : `${row.outcome} (not a verdict)`;
    return `<tr data-outcome="${escapeHtml(row.outcome.toLowerCase())}"><th scope="row">${escapeHtml(name)}</th><td>${escapeHtml(row.exit)}</td><td>${escapeHtml(row.next)}</td></tr>`;
  }).join("");
  return `<table class="scenario-exits"><caption>Exit codes from harness gate. Only Pass exits 0.</caption><thead><tr><th scope="col">Outcome</th><th scope="col">Exit</th><th scope="col">What to do</th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderRules(rules) {
  if (!rules?.length) return "";
  return `<ul class="scenario-rules">${rules.map((rule) => `<li>${renderRich(rule)}</li>`).join("")}</ul>`;
}

function renderTabs(board, selected) {
  const tabs = SAMPLE_TABS.map((tab) => {
    const on = tab.id === selected;
    return `<button type="button" class="scenario-tab" role="tab" id="scenario-tab-${tab.id}" data-tab="${tab.id}" aria-controls="scenario-panel-${tab.id}" aria-selected="${on ? "true" : "false"}" tabindex="${on ? "0" : "-1"}">${escapeHtml(tab.label)}</button>`;
  }).join("");
  const panels = SAMPLE_TABS.map((tab) => {
    const on = tab.id === selected;
    return `<div role="tabpanel" class="scenario-panel" id="scenario-panel-${tab.id}" data-tab="${tab.id}" aria-labelledby="scenario-tab-${tab.id}" tabindex="0"${on ? "" : " hidden"}>${renderPanel(board, tab.id)}</div>`;
  }).join("");
  return `<div class="scenario-tabs" role="tablist" aria-label="Work samples">${tabs}</div>${panels}`;
}

function renderPanel(board, tab) {
  const samples = board.samples;
  if (tab === "commands") return sampleBlock(samples.commands, { caption: "Command", ...sampleOpts(board) });
  if (tab === "results") {
    const rows = samples.diagnostics
      ? sampleBlock(samples.diagnostics, { caption: samples.diagnosticsCaption || "Diagnostic rows (Example)", ...sampleOpts(board) })
      : "";
    return `${sampleBlock(samples.results, { caption: samples.resultsCaption || "Results excerpt", ...sampleOpts(board) })}${rows}`;
  }
  const note = board.outputNote ? `<p class="scenario-callout">${renderRich(board.outputNote)}</p>` : "";
  const checks = samples.checks ? sampleBlock(samples.checks, { caption: samples.checksCaption || "Command output", ...sampleOpts(board) }) : "";
  const pipeline = samples.pipeline
    ? sampleBlock(samples.pipeline, { ...sampleOpts(board), pipeline: true, caption: samples.pipelineCaption || "Example pipeline step" })
    : "";
  const exampleBlock = tab === "output" && samples.example
    ? sampleBlock(samples.example, { caption: samples.exampleCaption || "Not a captured run", label: "", example: true })
    : "";
  return `${sampleBlock(samples.output, { caption: samples.outputCaption || "Run log", ...sampleOpts(board) })}${note}${checks}${pipeline}${exampleBlock}`;
}

export function renderDialogHtml(board, tab = "commands") {
  const steps = (board.steps || []).map((step) => `<li>${renderRich(step)}</li>`).join("");
  const today = board.today ? `<p class="scenario-today"><span class="kicker">Where we are today</span> ${renderRich(board.today)}</p>` : "";
  const callouts = (board.callouts || []).map((note) => `<p class="scenario-callout">${renderRich(note)}</p>`).join("");
  const extra = board.extra ? `<div class="scenario-extra">${paragraphs(board.extra)}</div>` : "";
  const footnote = board.footnote ? `<p class="fine">${renderRich(board.footnote)}</p>` : "";
  return `<div class="scenario-dialog-panel"><header class="scenario-dialog-bar"><div><p class="kicker">${escapeHtml(board.index)}</p><h2 id="scenario-dialog-title" tabindex="-1">${escapeHtml(board.title)}</h2></div><button type="button" class="btn btn-ghost scenario-close" data-close>Close</button></header><p class="scenario-hook">${escapeHtml(board.hook)}</p><section aria-labelledby="scenario-situation-label"><h3 id="scenario-situation-label">The situation</h3><div id="scenario-situation">${paragraphs(board.situation)}</div></section><section aria-labelledby="scenario-action-label"><h3 id="scenario-action-label">What to do</h3><ol class="scenario-steps">${steps}</ol>${today}${footnote}</section>${renderCompare(board.compare)}<section aria-labelledby="scenario-verdict-label"><h3 id="scenario-verdict-label">Verdict</h3>${renderVerdict(board)}${renderRules(board.rules)}${callouts}${renderNumberline(board.numberline)}${renderMeters(board.meters)}${renderExits(board.exits)}${extra}</section>${renderTabs(board, tab)}</div>`;
}

function tabbableElements(root) {
  const selector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]';
  return [...root.querySelectorAll(selector)].filter((el) => {
    if (el.getAttribute("tabindex") === "-1") return false;
    if (el.closest("[hidden]")) return false;
    return true;
  });
}

function selectorId(id) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(id);
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
}

export function bindScenarios(root, options = {}) {
  const scenarios = options.scenarios || SCENARIOS;
  const doc = options.document || document;
  root.innerHTML = renderGridHtml(scenarios);

  let dialog = doc.getElementById("scenarios-dialog");
  if (!dialog) {
    dialog = doc.createElement("dialog");
    dialog.id = "scenarios-dialog";
    dialog.className = "scenario-dialog";
    doc.body.append(dialog);
  }
  for (const [key, value] of Object.entries(DIALOG_ATTRS)) dialog.setAttribute(key, value);

  let state = createScenarioState();
  let trigger = null;

  function open(id) {
    const board = scenarios.find((item) => item.id === id);
    if (!board) return;
    trigger = root.querySelector(`[data-scenario="${selectorId(id)}"]`);
    state = reduceScenario(state, { type: "open", id });
    dialog.innerHTML = renderDialogHtml(board, state.tab);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute("open", "");
    dialog.querySelector("#scenario-dialog-title")?.focus();
  }

  function finishClose() {
    const node = trigger;
    trigger = null;
    state = reduceScenario(state, { type: "close" });
    node?.focus();
  }

  function requestClose() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else finishClose();
  }

  function selectTab(id, shouldFocus) {
    state = reduceScenario(state, { type: "tab", tab: id });
    for (const tab of dialog.querySelectorAll('[role="tab"]')) {
      const on = tab.dataset.tab === state.tab;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && shouldFocus) tab.focus();
    }
    for (const panel of dialog.querySelectorAll('[role="tabpanel"]')) {
      panel.hidden = panel.dataset.tab !== state.tab;
    }
  }

  dialog.addEventListener("close", () => {
    const node = trigger;
    trigger = null;
    state = reduceScenario(state, { type: "close" });
    const focusBoard = () => node?.focus();
    if (typeof queueMicrotask === "function") queueMicrotask(focusBoard);
    setTimeout(focusBoard, 0);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      requestClose();
      return;
    }
    if (event.target.closest("[data-close]")) {
      requestClose();
      return;
    }
    const tab = event.target.closest('[role="tab"]');
    if (tab) selectTab(tab.dataset.tab, false);
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key === "Tab") {
      const items = tabbableElements(dialog);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const index = items.indexOf(doc.activeElement);
      const edge = index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1);
      if (!edge) return;
      event.preventDefault();
      items[cycleFocusIndex(items.length, index, event.shiftKey)].focus();
      return;
    }
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab) return;
    const next = nextTab(tab.dataset.tab, event.key);
    if (!next) return;
    event.preventDefault();
    selectTab(next, true);
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scenario]");
    if (!button || !root.contains(button)) return;
    open(button.dataset.scenario);
  });

  const hash = String(doc.location?.hash || "").replace(/^#/, "");
  if (hash && scenarios.some((board) => board.id === hash)) open(hash);

  return { open, close: requestClose };
}
