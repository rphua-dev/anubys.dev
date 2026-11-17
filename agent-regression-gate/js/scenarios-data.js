/**
 * Scenario boards for the Scenarios page.
 * Swap samples in this file. Markup stays put.
 * Boards 3 to 6 use the reviewed copy. Boards 1, 2, 7, and 8 are placeholders.
 * Every sample block is Illustrative. Invented run numbers wear an Example chip.
 * The gate command is `harness gate --baseline <dir> --candidate <dir> [--json PATH]`.
 * Do not add an interval-method field to gate output.
 */

export const VERDICT_NAMES = ["Pass", "Block", "Insufficient evidence", "Invalid run"];

export const SAMPLE_TABS = [
  { id: "commands", label: "Commands" },
  { id: "output", label: "Output" },
  { id: "results", label: "Results excerpt" },
];

const BOARD_1_COMMANDS = `GEMINI_API_KEY= python -m harness run suites/dev_fixtures --model fixture-model --mode live --out runs/plan --limit 2 --rollouts 1 --ceiling 1 --dry-run
GEMINI_API_KEY= python -m harness run suites/dev_fixtures --mode replay --cassettes cassettes/dev --out runs/replay`;

const BOARD_1_OUTPUT = `plan
suite: dev_fixtures
mode: live
dry_run: true
scenario: example.clean.v1
scenario: example.broken.v1
model_calls: 0

replay
suite: dev_fixtures
mode: replay
scenario: example.clean.v1
scenario: example.broken.v1
model_calls: 0
exit code: 0`;

const BOARD_1_RESULTS = `{
  "suite": "dev_fixtures",
  "dry_run": true,
  "scenarios": ["example.clean.v1", "example.broken.v1"],
  "model_calls": 0
}`;

const BOARD_2_COMMANDS = `python -m harness run suites/dev_fixtures --mode replay --cassettes cassettes/main --out runs/pr
# --record belongs on the manual live workflow, not on the pull request
python -m harness run suites/dev_fixtures --mode live --record --ceiling 1 --out runs/live`;

const BOARD_2_OUTPUT = `replay
suite: dev_fixtures
mode: replay
cassettes: cassettes/main
scenario: example.clean.v1
scenario: example.broken.v1
model_calls: 0
exit code: 0`;

const BOARD_2_RESULTS = `{
  "mode": "replay",
  "cassettes": "cassettes/main",
  "scenarios": ["example.clean.v1", "example.broken.v1"],
  "model_calls": 0
}`;

const BOARD_3_COMMANDS = `python -m harness convert-tau-retail --split test --index 66 --out /tmp/retail-drafts
python -m harness validate /tmp/retail-drafts
# rewrite the user text and initial state, set provenance, set owner
python -m harness validate --write-hashes /tmp/retail-drafts
python -m harness gates /tmp/retail-drafts`;

const BOARD_3_OUTPUT = `$ python -m harness convert-tau-retail --split test --index 66 --out /tmp/retail-drafts
tau_retail.test.066.v1.yaml  allowed  cancel  4-7  sha256:d70cdae6...
wrote 1 scenario(s) to /tmp/retail-drafts

$ python -m harness validate /tmp/retail-drafts
ok 1 scenario(s), 0 suite file(s)`;

const BOARD_3_CHECKS = `$ python -m harness validate /tmp/retail-drafts
/tmp/retail-drafts/tau_retail.test.066.v1.yaml: gate_eligible: gate_eligible must be false for a straight τ-bench conversion. Rewrite the wording and state, set provenance.method to rewritten, then set gate_eligible.
1 error(s) in 1 file(s); 1 scenario(s) parsed
exit code: 1

$ python -m harness gates /tmp/retail-drafts
schema: pass (1 scenario(s), 0 suite file(s))
synthetic-pii: pass (1 scenario(s), 0 cassette file(s))
secrets: pass (python scanner; gitleaks not installed, trufflehog not installed; 1 file(s))
exact-duplicates: pass (1 scenario(s), canonical content hash)
near-duplicates: pass (1 scenario(s), MinHash on user turns, threshold 0.8)
splits: pass (1 family(ies), one split each)
ok 6 gate(s)
exit code: 0`;

const BOARD_3_RESULTS = `scenario_id: acme.cancel.001.v1
family_id: acme.cancel.001
variant_id: v1
task_type: cancel
policy_condition: allowed
split: gate
gate_eligible: false
owner: your-name
user_simulator:
  goal: The customer's pending order is cancelled and nothing else changes.
  instruction: >
    You ordered a desk lamp last night and found a cheaper one. You want
    the lamp order cancelled, and you only know it by the lamp.
provenance:
  source: tau_bench_retail
  method: rewritten
  rewritten: true
  upstream_split: test
  upstream_index: 66`;

const BOARD_4_COMMANDS = `harness gate --baseline runs/baseline --candidate runs/candidate --rollouts 5 --json runs/verdict.json`;

const BOARD_4_OUTPUT = `$ harness run suites/my_retail --model gemini-2.5-flash-lite --mode replay --cassettes cassettes/baseline --out runs/baseline
run_id=2026-11-17-my_retail-3f9a1c2e date=2026-11-17 git_sha=a1b2c3d model=gemini-2.5-flash-lite model_version=2.5-flash-lite-07-2026 mode=replay
outcomes pass=470 fail=30 env_miss=0 timeout=0 error=0
total_cost_usd=0.00 cached_input_tokens=0 p50_s=4.2 max_s=19.8
wrote runs/baseline/run_summary.json

$ harness run suites/my_retail --model gemini-3.5-flash-lite --mode replay --cassettes cassettes/candidate --out runs/candidate
run_id=2026-11-17-my_retail-7d41e0b9 date=2026-11-17 git_sha=a1b2c3d model=gemini-3.5-flash-lite model_version=3.5-flash-lite-07-2026 mode=replay
outcomes pass=469 fail=31 env_miss=0 timeout=0 error=0
total_cost_usd=0.00 cached_input_tokens=0 p50_s=3.1 max_s=14.6
wrote runs/candidate/run_summary.json

That's 100 invented scenarios times 5 rollouts, so 500 per arm.`;

const BOARD_4_PIPELINE = `Run harness gate --baseline runs/baseline --candidate runs/candidate --rollouts 5 --json runs/verdict.json
verdict: pass
difference: -0.002
ci_lower: -0.0268972382375
ci_upper: 0.0228972382375
ci_level: 0.9
delta: 0.05
baseline_pass_rate: 0.94
baseline_passes: 470
baseline_counted: 500
candidate_pass_rate: 0.938
candidate_passes: 469
candidate_counted: 500
baseline_model_id: gemini-2.5-flash-lite
candidate_model_id: gemini-3.5-flash-lite
baseline_total_cost_usd: 0.00
candidate_total_cost_usd: 0.00
harness gate exit code: 0`;

const BOARD_4_RESULTS = `{
  "verdict": "pass",
  "delta": 0.05,
  "ci_level": 0.9,
  "difference": -0.002,
  "difference_ci": { "lower": -0.0269, "upper": 0.0229, "level": 0.9 },
  "baseline_pass_rate": 0.94,
  "candidate_pass_rate": 0.938,
  "baseline_passes": 470,
  "baseline_counted": 500,
  "candidate_passes": 469,
  "candidate_counted": 500,
  "reasons": []
}`;

const BOARD_5_COMMANDS = `harness gate --baseline runs/baseline --candidate runs/candidate --rollouts 5`;

const BOARD_5_OUTPUT = `$ harness run suites/my_retail --model gemini-2.5-flash-lite --mode replay --cassettes cassettes/baseline --out runs/baseline
run_id=2026-11-17-my_retail-0c6b2a15 date=2026-11-17 git_sha=a1b2c3d model=gemini-2.5-flash-lite model_version=2.5-flash-lite-07-2026 mode=replay
outcomes pass=88 fail=12 env_miss=0 timeout=0 error=0
total_cost_usd=0.00 cached_input_tokens=0 p50_s=4.0 max_s=17.5
wrote runs/baseline/run_summary.json

$ harness run suites/my_retail --model gemini-3.5-flash-lite --mode replay --cassettes cassettes/candidate --out runs/candidate
run_id=2026-11-17-my_retail-91ae5d03 date=2026-11-17 git_sha=a1b2c3d model=gemini-3.5-flash-lite model_version=3.5-flash-lite-07-2026 mode=replay
outcomes pass=86 fail=14 env_miss=0 timeout=0 error=0
total_cost_usd=0.00 cached_input_tokens=0 p50_s=3.0 max_s=12.9
wrote runs/candidate/run_summary.json

That's 20 invented scenarios times 5 rollouts, so 100 per arm.`;

const BOARD_5_PIPELINE = `Run harness gate --baseline runs/baseline --candidate runs/candidate --rollouts 5
verdict: insufficient_evidence
difference: -0.02
ci_lower: -0.0981954487567
ci_upper: 0.0581954487567
ci_level: 0.9
delta: 0.05
baseline_pass_rate: 0.88
baseline_passes: 88
baseline_counted: 100
candidate_pass_rate: 0.86
candidate_passes: 86
candidate_counted: 100
baseline_model_id: gemini-2.5-flash-lite
candidate_model_id: gemini-3.5-flash-lite
baseline_total_cost_usd: 0.00
candidate_total_cost_usd: 0.00
Error: Process completed with exit code 3.`;

const BOARD_5_RESULTS = `{
  "verdict": "insufficient_evidence",
  "delta": 0.05,
  "ci_level": 0.9,
  "difference": -0.02,
  "difference_ci": { "lower": -0.0982, "upper": 0.0582, "level": 0.9 },
  "baseline_pass_rate": 0.88,
  "candidate_pass_rate": 0.86,
  "baseline_passes": 88,
  "baseline_counted": 100,
  "candidate_passes": 86,
  "candidate_counted": 100,
  "reasons": [],
  "diagnostics": [
    {
      "scenario_id": "acme.return.003.v1",
      "family_id": "acme.return.003",
      "scheduled_rollouts": { "baseline": 5, "candidate": 5 },
      "miss_counts": { "baseline": 0, "candidate": 0 },
      "baseline_pass_rate": 1.0,
      "candidate_pass_rate": 0.4,
      "difference": -0.6,
      "difference_ci": { "lower": -0.9604, "upper": -0.2396, "level": 0.9 },
      "note": "Diagnostic only. The suite verdict is the only gate."
    },
    {
      "scenario_id": "acme.cancel.001.v1",
      "family_id": "acme.cancel.001",
      "scheduled_rollouts": { "baseline": 5, "candidate": 5 },
      "miss_counts": { "baseline": 0, "candidate": 0 },
      "baseline_pass_rate": 0.6,
      "candidate_pass_rate": 0.8,
      "difference": 0.2,
      "difference_ci": { "lower": -0.2652, "upper": 0.6652, "level": 0.9 },
      "note": "Diagnostic only."
    }
  ]
}`;

const BOARD_6_COMMANDS = `harness gate --baseline runs/baseline --candidate runs/candidate --rollouts 5`;

const BOARD_6_OUTPUT = `$ harness run suites/my_retail --model gemini-3.5-flash-lite --mode live --ceiling 1 --out runs/candidate
run_id=2026-11-17-my_retail-b27c9f40 date=2026-11-17 git_sha=a1b2c3d model=gemini-3.5-flash-lite model_version=3.5-flash-lite-07-2026 mode=live
outcomes pass=15 fail=2 env_miss=0 timeout=3 error=0
total_cost_usd=0.41 cached_input_tokens=1200 p50_s=3.4 max_s=21.0
wrote runs/candidate/run_summary.json

The 3 timeouts here are infrastructure timeouts (reason code rate_limit). That's 4 invented scenarios times 5 rollouts, so 20 per arm.
A replay with a missing cassette entry stops earlier, on one line: error: missing cassette keys: ...`;

const BOARD_6_PIPELINE = `Run harness gate --baseline runs/baseline --candidate runs/candidate --rollouts 5
verdict: invalid_run
ci_level: 0.9
delta: 0.05
baseline_pass_rate: 0.9
baseline_passes: 18
baseline_counted: 20
candidate_pass_rate: 0.882352941176
candidate_passes: 15
candidate_counted: 17
baseline_model_id: gemini-2.5-flash-lite
candidate_model_id: gemini-3.5-flash-lite
baseline_total_cost_usd: 0.38
candidate_total_cost_usd: 0.41
reasons:
- candidate: 3 in 20 scheduled rollouts are env_miss, an infra timeout, or unrecorded (3 in 20), which is more than 1 in 20. Judged per arm, not pooled. That run is invalid_run.
- candidate scenario acme.return.002.v1: 2 valid rollouts of 5 scheduled; need at least 3 (ceil(3/5 * 5)). Valid rollouts are pass, fail, an agent timeout, an agent error, or a spend-ceiling error. Both arms must meet the floor or the run is invalid_run.
Error: Process completed with exit code 4.`;

const BOARD_6_RESULTS = `{
  "verdict": "invalid_run",
  "delta": 0.05,
  "ci_level": 0.9,
  "baseline_pass_rate": 0.9,
  "baseline_passes": 18,
  "baseline_counted": 20,
  "candidate_pass_rate": 0.882352941176,
  "candidate_passes": 15,
  "candidate_counted": 17,
  "environment_misses": {
    "baseline": { "scheduled": 20, "misses": 0 },
    "candidate": { "scheduled": 20, "misses": 3 }
  },
  "diagnostics": [
    {
      "scenario_id": "acme.return.002.v1",
      "family_id": "acme.return.002",
      "scheduled_rollouts": { "baseline": 5, "candidate": 5 },
      "miss_counts": { "baseline": 0, "candidate": 3 },
      "missing_cassette_keys": { "baseline": [], "candidate": [] },
      "note": "Three infrastructure timeouts, so no cassette keys. Diagnostic only."
    }
  ],
  "reasons": [
    "candidate: 3 in 20 scheduled rollouts are environment misses. Judged per arm, not pooled."
  ]
}`;

const BOARD_7_COMMANDS = `python -m harness run suites/dev_fixtures --mode live --ceiling 1 --out runs/live
python -m harness run suites/dev_fixtures --mode replay --cassettes cassettes/dev --out runs/replay
python -m harness validate suites/dev_fixtures`;

const BOARD_7_OUTPUT = `error: monthly spend is at the cap. The next live rollout doesn't start.

replay
suite: dev_fixtures
mode: replay
scenario: example.clean.v1
exit code: 0

validate
ok 2 scenario(s), 0 suite file(s)
exit code: 0`;

const BOARD_7_RESULTS = `{
  "live_rollout": "not started",
  "message": "error: monthly spend is at the cap. The next live rollout doesn't start.",
  "replay": "still runs",
  "validate": "still runs"
}`;

const BOARD_8_COMMANDS = `# Outside a checkout each machine keeps its own log.
# The experiment workflow merges live-spend-rows artifacts, then runs the monthly check.`;

const BOARD_8_OUTPUT = `machine-a ~/.anubys/spend_log.jsonl month sum 12.00
machine-b ~/.anubys/spend_log.jsonl month sum 9.00
merged live-spend-rows month sum 21.00
monthly check: under the cap
next live rollout: still allowed on this sample`;

const BOARD_8_RESULTS = `{
  "logs": [
    { "machine": "machine-a", "path": "~/.anubys/spend_log.jsonl", "month_sum": "12.00" },
    { "machine": "machine-b", "path": "~/.anubys/spend_log.jsonl", "month_sum": "9.00" }
  ],
  "merged_artifact": "live-spend-rows",
  "merged_month_sum": "21.00"
}`;

const TIMEOUT_NOTE = "timeout=3 counts infrastructure timeouts (environment misses), not agent timeouts. Agent timeouts count as task failures.";

export const SCENARIOS = [
  {
    id: "prove-install",
    index: "01",
    title: "Prove the install",
    hook: "Dry-run the bundled suite, then replay it. Both work with GEMINI_API_KEY unset.",
    placeholder: true,
    situation: "You want proof the install works before any model call. Leave GEMINI_API_KEY unset on purpose. Neither command should reach a model.",
    steps: [
      "Dry-run the bundled dev-fixture suite.",
      "Replay it from a cassette you already have.",
      "Both commands are run with GEMINI_API_KEY unset.",
    ],
    verdict: {
      scope: "command",
      display: "Pass",
      exit: 0,
      why: "Both commands exit 0. This is the command outcome, not a suite verdict. A suite verdict comes from harness gate.",
    },
    samples: {
      commands: BOARD_1_COMMANDS,
      output: BOARD_1_OUTPUT,
      pipeline: "",
      results: BOARD_1_RESULTS,
      resultsCaption: "Plan excerpt",
    },
  },
  {
    id: "cheap-pull-requests",
    index: "02",
    title: "Keep pull requests cheap",
    hook: "Replay the cassette recorded on main. Record with --record only from the manual live workflow.",
    placeholder: true,
    situation: "A pull request should not start a live model call. The cassette recorded on main is enough for the check.",
    steps: [
      "Replay the cassette recorded on main.",
      "Use --record only from the manual live workflow.",
    ],
    verdict: {
      scope: "command",
      display: "Pass",
      exit: 0,
      why: "Replay exits 0 and does not call the model. This is the command outcome, not a suite verdict.",
    },
    samples: {
      commands: BOARD_2_COMMANDS,
      output: BOARD_2_OUTPUT,
      pipeline: "",
      results: BOARD_2_RESULTS,
      resultsCaption: "Replay excerpt",
    },
  },
  {
    id: "new-retail-task",
    index: "03",
    title: "You want a new retail task",
    hook: "Public benchmark tasks can't go straight into the test that decides merges. Anubys makes you rewrite them first.",
    placeholder: false,
    situation: "You want a new retail scenario, say a customer cancelling an order. The quickest start is to convert a public task from the vendored tau-bench snapshot. But if the wording is a straight copy of a public task, a model may have seen it in training. A merge test built on that would flatter the candidate and tell you nothing.",
    steps: [
      "`convert-tau-retail` writes a draft. Every straight conversion comes out with `gate_eligible: false`, provenance.method set to tau_bench_straight, and `split` set to dev or test.",
      "`validate` refuses a straight copy that claims `gate_eligible: true`, or one moved to `split: gate` or `held_out`. Hashes are checked here too.",
      "You rewrite the user text and the initial state, set provenance.method to rewritten and provenance.rewritten to true, and put your name in `owner`. Only a rewritten scenario can sit in `split: gate`.",
      "`gates` runs the sanitization checks: schema, synthetic personal data, secrets, exact duplicates, near duplicates, and one split per family. This is `harness gates` (plural). It does not give a suite verdict.",
      "`gate_eligible` stays false until a person spot-checks the rewrite.",
    ],
    today: "All 78 built suite scenarios are `gate_eligible: false`. The contamination rewrite hasn't landed yet. They run for calibration, but none of them is cleared to count toward a merge verdict yet.",
    verdict: {
      scope: "none",
      display: null,
      exit: null,
      why: "This board doesn't produce a verdict. It decides whether a scenario is allowed to feed one. `harness gates` checks the files. `harness gate` is the command that prints a suite verdict, and a straight copy stays out of that test.",
    },
    compare: {
      beforeTitle: "Straight copy",
      before: ["Blocked from split: gate", "gate_eligible stays false", "provenance.method is tau_bench_straight"],
      afterTitle: "Rewritten",
      after: ["Allowed in split: gate", "provenance.method is rewritten", "gate_eligible stays false until a person spot-checks"],
    },
    samples: {
      commands: BOARD_3_COMMANDS,
      output: BOARD_3_OUTPUT,
      pipeline: "",
      checks: BOARD_3_CHECKS,
      checksCaption: "Command output with exit codes",
      results: BOARD_3_RESULTS,
      resultsCaption: "Scenario file after the rewrite",
    },
    footnote: "In the repo's own CI the same gates check runs with `--require-gitleaks`, so a missing gitleaks fails the job. Field names in the file are real. The user text and the values are invented.",
  },
  {
    id: "candidate-merge",
    index: "04",
    title: "May a candidate model merge?",
    hook: "One command, one verdict, one exit code. Only Pass exits 0.",
    placeholder: false,
    situation: "A teammate wants to swap the support agent over to a newer, cheaper model. You have a run of the current agent (baseline) and a run of the new one (candidate), both on the same scenarios. Someone has to say yes or no in the pull request, and a look of approval doesn't cut it.",
    steps: [
      "Run `harness gate --baseline runs/baseline --candidate runs/candidate`. Add `--json` when you want the same verdict written to a file.",
      "`--rollouts` is the per-scenario count both runs used. Leave it off to use rollouts from suite.yaml. Add `--suite` to use your own suite settings instead of the packaged ones.",
      "The gate reads pass rate across all rollouts in each arm, pooled across scenarios, and builds a 90% interval on the gap (candidate minus baseline). The allowed drop is 5 percentage points.",
      "The gate doesn't check scenario hashes. Run `harness validate` on your scenarios first. That's where hashes are checked.",
    ],
    verdict: {
      scope: "gate",
      display: "Pass",
      exit: 0,
      why: "The sample is a Pass: the gap is tiny and the whole 90% interval stays above minus 5 points. Safe to merge. The exit code is the verdict. Anything other than 0 fails a plain CI step, on purpose.",
    },
    exits: [
      { outcome: "Pass", exit: 0, next: "Merge is fine", verdict: true },
      { outcome: "Block", exit: 1, next: "Keep the current agent", verdict: true },
      { outcome: "Bad input", exit: 2, next: "Fix the command or the run folders, then rerun", verdict: false },
      { outcome: "Insufficient evidence", exit: 3, next: "Run more rollouts or keep the current agent", verdict: true },
      { outcome: "Invalid run", exit: 4, next: "Fix the run, then rerun", verdict: true },
    ],
    rules: [
      "Pass if the whole interval sits above minus 5 points. Exit 0. Only Pass exits 0.",
      "Block if the whole interval sits below minus 5 points. The candidate is clearly worse. Exit 1.",
      "Insufficient evidence if the interval crosses minus 5 points. Can't tell yet. Exit 3.",
      "Invalid run if the run itself isn't trustworthy. Exit 4.",
      "A bad input exits 2. That includes baseline and candidate not covering the same scenarios, or a run directory that doesn't exist. It isn't a verdict.",
    ],
    samples: {
      commands: BOARD_4_COMMANDS,
      output: BOARD_4_OUTPUT,
      pipeline: BOARD_4_PIPELINE,
      results: BOARD_4_RESULTS,
      resultsCaption: "What --json writes",
    },
  },
  {
    id: "interval-crosses",
    index: "05",
    title: "The interval crosses the margin",
    hook: "\"We can't tell yet\" is a real answer, and it's not a pass.",
    placeholder: false,
    situation: "{example} The candidate scored 86 out of 100 and the baseline scored 88 out of 100. Two points lower. Somebody in the pull request says it's basically the same. {example} Somebody else points at a scenario where the candidate dropped from 5 out of 5 to 2 out of 5 and says it's clearly worse. Both are guessing.",
    steps: [
      "Run more rollouts, or keep the current agent. Small suites land here a lot, because few rollouts means a wide interval.",
      "Do not read one scenario row as its own gate. Per-scenario rows are diagnostics only. They have no pass or block field. One row can look worse while the suite verdict is still Pass, and one row can look fine while the suite is Block. Only the suite verdict decides.",
    ],
    verdict: {
      scope: "gate",
      display: "Insufficient evidence",
      exit: 3,
      why: "Insufficient evidence, exit 3. The gate builds a 90% interval on the pass-rate gap (candidate minus baseline), with rollouts pooled within each arm. The rule uses a 5 point margin and one-sided alpha 0.05. {example} Here the interval runs from about minus 9.8 points to plus 5.8 points. It covers minus 5, so the data fits \"fine\" and it also fits \"5 points worse\". A bound that only touches minus 5 doesn't count either way. The sample bounds are illustrative. The rule stays: compare the interval with minus 5 points.",
    },
    rules: [
      "Lower end above minus 5 points: Pass.",
      "Upper end below minus 5 points: Block.",
      "Anything else: Insufficient evidence.",
    ],
    numberline: {
      min: -15,
      max: 10,
      margin: -5,
      lower: -9.8,
      upper: 5.8,
      caption: "The 90% interval crosses the minus 5 point margin.",
    },
    extra: "{example} The gap in this sample is minus 2 points. likely_regression is only true when the verdict is Insufficient evidence and the point estimate is strictly below minus 5 points. In v0.1 the gate doesn't compute that flag from a run. Exit 3 means run more rollouts. If your pipeline wants to treat that differently from a Block, catch the code in the step instead of letting it fail the job.",
    samples: {
      commands: BOARD_5_COMMANDS,
      output: BOARD_5_OUTPUT,
      pipeline: BOARD_5_PIPELINE,
      results: BOARD_5_RESULTS,
      resultsCaption: "Gate JSON, plus diagnostic rows that are not a gate",
    },
  },
  {
    id: "environment-misses",
    index: "06",
    title: "Too many environment misses",
    hook: "If the test setup broke, the result says nothing about the agent.",
    cardNote: "timeout=3 is an infrastructure miss, not an agent timeout.",
    placeholder: false,
    situation: "{example} Your candidate run finishes, but 3 of the 20 rollouts never got an answer from the environment. The provider rate-limited the run, or a replay cassette was missing an entry, or the CI runner got killed. The pass rate looks low, and somebody wants to blame the new model.",
    steps: [
      "Fix the cassettes, the rate limits, or the runner, and run again.",
      "An Invalid run doesn't mean the agent got worse. It means the test didn't run cleanly enough to judge. No interval is computed, so there's no difference to argue about.",
    ],
    verdict: {
      scope: "gate",
      display: "Invalid run",
      exit: 4,
      why: "Invalid run, exit 4. A rollout counts as an environment miss when it hit a cassette miss, an infra timeout (rate limit, provider 5xx, API timeout, CI kill), or never produced a recorded outcome at all. Each arm is judged on its own, not pooled, against its own scheduled rollouts. Misses stay out of the pass rate.",
    },
    rules: [
      "Misses are strictly above 1 in 20 scheduled rollouts in either arm (exactly 1 in 20 is fine).",
      "Any scenario has fewer valid rollouts than the coverage floor, which is 0.6 times the scheduled count rounded up (so 3 of 5).",
      "A live rollout came back with a missing or unexpected model version.",
      "An arm has zero counted rollouts, so there's no pass rate to compare.",
    ],
    callouts: [
      TIMEOUT_NOTE,
      "This result does not say the agent got worse.",
    ],
    outputNote: TIMEOUT_NOTE,
    meters: {
      capLabel: "1 in 20",
      scale: 0.25,
      arms: [
        { name: "Baseline", misses: 0, scheduled: 20 },
        { name: "Candidate", misses: 3, scheduled: 20 },
      ],
    },
    extra: "missing_cassette_keys can be shorter than miss_counts. Infrastructure timeouts and rollouts with no recorded outcome are misses, but they don't have a cassette key. A cassette miss does, for example acme.return.002.v1/get_order_details. An agent timeout, an agent error, and a spend-ceiling error are different: they count as task failures and do not count as misses. No difference and no interval bounds are printed. An Invalid run never gets an interval.",
    samples: {
      commands: BOARD_6_COMMANDS,
      output: BOARD_6_OUTPUT,
      pipeline: BOARD_6_PIPELINE,
      results: BOARD_6_RESULTS,
      resultsCaption: "Gate JSON. No interval, because the run is invalid.",
    },
  },
  {
    id: "spend-cap",
    index: "07",
    title: "Spend is at the cap",
    hook: "The next live rollout doesn't start. Replay and validate still run.",
    placeholder: true,
    situation: "Logged spend for the month has reached the cap. The message is a single error: line. The next live rollout doesn't start.",
    steps: [
      "Read the single error: line.",
      "Replay and validate still run. They do not start a live rollout.",
      "The monthly check in this sample is the {example} $38 check.",
    ],
    verdict: {
      scope: "none",
      display: null,
      exit: null,
      why: "There is no suite verdict. The live command stops before a rollout, so it does not print Pass, Block, Insufficient evidence, or Invalid run.",
    },
    samples: {
      commands: BOARD_7_COMMANDS,
      output: BOARD_7_OUTPUT,
      pipeline: "",
      results: BOARD_7_RESULTS,
      resultsCaption: "Spend excerpt",
    },
  },
  {
    id: "two-spend-logs",
    index: "08",
    title: "Two machines, two spend logs",
    hook: "Outside a checkout the log is per user and per machine.",
    placeholder: true,
    situation: "Two machines each wrote a live spend log. Outside a checkout those logs do not share a total. The log is per user and per machine.",
    steps: [
      "The GitHub experiment workflow sums the month by merging live-spend-rows artifacts before the {example} $38 check.",
    ],
    verdict: {
      scope: "none",
      display: null,
      exit: null,
      why: "There is no suite verdict. This step adds up spend. It is not harness gate.",
    },
    samples: {
      commands: BOARD_8_COMMANDS,
      output: BOARD_8_OUTPUT,
      pipeline: "",
      results: BOARD_8_RESULTS,
      resultsCaption: "Merged spend excerpt",
    },
  },
];
