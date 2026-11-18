import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { CANDIDATES, SCENARIO_SETS, buildRun } from "../js/demo-data.js";
import {
  METHOD_NOTES,
  armMissExceeds,
  interpretSlot,
  requiredValid,
  scoreRun,
  summarizeArm,
} from "../js/verdict.js";

test("5, 7, and 20 coverage floors", () => {
  assert.equal(requiredValid(5), 3);
  assert.equal(requiredValid(7), 5);
  assert.equal(requiredValid(20), 12);
});

test("exactly 5% excluded still produces a verdict", () => {
  assert.equal(armMissExceeds(5, 100), false);
  assert.equal(armMissExceeds(1, 20), false);
  const result = scoreRun([
    scenario("edge", {
      baseline: { scheduled: 100, slots: Array.from({ length: 100 }, () => "pass") },
      candidate: {
        scheduled: 100,
        slots: [
          ...Array.from({ length: 95 }, () => "pass"),
          ...Array.from({ length: 5 }, () => "infra_timeout"),
        ],
      },
    }),
  ]);
  assert.equal(result.verdict, "no_regression");
  assert.equal(result.candidate.excluded, 5);
});

test("6% excluded on one arm invalidates the run", () => {
  assert.equal(armMissExceeds(6, 100), true);
  const result = scoreRun([
    scenario("only", {
      baseline: { scheduled: 100, slots: Array.from({ length: 100 }, () => "pass") },
      candidate: {
        scheduled: 100,
        slots: [
          ...Array.from({ length: 94 }, () => "pass"),
          ...Array.from({ length: 6 }, () => "infra_timeout"),
        ],
      },
    }),
  ]);
  assert.equal(result.verdict, "invalid_run");
  assert.equal(result.meanDelta, null);
  assert.ok(result.invalidReasons.some((reason) => reason.includes("candidate")));
  assert.equal(result.invalidReasons.some((reason) => reason.startsWith("On the baseline side")), false);
});

test("a 6% miss on the baseline arm alone is enough", () => {
  const result = scoreRun([
    scenario("baseline-arm", {
      baseline: {
        scheduled: 100,
        slots: [
          ...Array.from({ length: 94 }, () => "pass"),
          ...Array.from({ length: 6 }, () => "missing"),
        ],
      },
      candidate: { scheduled: 100, slots: Array.from({ length: 100 }, () => "pass") },
    }),
  ]);
  assert.equal(result.verdict, "invalid_run");
  assert.ok(result.invalidReasons.some((reason) => reason.startsWith("On the baseline side")));
});

test("agent timeouts count as fails and infrastructure timeouts are excluded", () => {
  const agent = summarizeArm({
    scheduled: 5,
    slots: ["pass", "agent_timeout", "agent_timeout", "fail", "pass"],
  });
  assert.equal(agent.valid, 5);
  assert.equal(agent.passes, 2);
  assert.equal(agent.excluded, 0);
  assert.equal(interpretSlot("agent_timeout").score, 0);

  const infra = summarizeArm({
    scheduled: 5,
    slots: ["pass", "infra_timeout", "infra_timeout", "pass", "pass"],
  });
  assert.equal(infra.valid, 3);
  assert.equal(infra.passRate, 1);
  assert.equal(infra.excluded, 2);
  assert.equal(interpretSlot("infra_timeout").valid, false);
});

test("a thin scenario invalidates even when the arm miss rate does not", () => {
  const result = scoreRun([
    scenario("thin", {
      baseline: {
        scheduled: 20,
        slots: [
          ...Array.from({ length: 11 }, () => "pass"),
          ...Array.from({ length: 9 }, () => "infra_timeout"),
        ],
      },
      candidate: { scheduled: 20, slots: Array.from({ length: 20 }, () => "pass") },
    }),
    scenario("clean", {
      baseline: { scheduled: 180, slots: Array.from({ length: 180 }, () => "pass") },
      candidate: { scheduled: 180, slots: Array.from({ length: 180 }, () => "pass") },
    }),
  ]);
  assert.equal(armMissExceeds(result.baseline.excluded, result.baseline.scheduled), false);
  assert.equal(result.verdict, "invalid_run");
  assert.ok(result.invalidReasons.some((reason) => reason.includes("at least 12")));
});

test("sitting exactly on the coverage floor is accepted", () => {
  const result = scoreRun([
    scenario("floor", {
      baseline: { scheduled: 5, slots: ["pass", "pass", "pass", "infra_timeout", "missing"] },
      candidate: { scheduled: 5, slots: Array.from({ length: 5 }, () => "pass") },
    }),
    scenario("rest", {
      baseline: { scheduled: 35, slots: Array.from({ length: 35 }, () => "pass") },
      candidate: { scheduled: 35, slots: Array.from({ length: 35 }, () => "pass") },
    }),
  ]);
  assert.equal(result.scenarios[0].baselineNeed, 3);
  assert.equal(armMissExceeds(2, 40), false);
  assert.equal(result.invalidReasons.length, 0);
  assert.notEqual(result.verdict, "invalid_run");
});

test("scenario order does not change the simulator verdict", () => {
  for (const set of SCENARIO_SETS) {
    for (const candidate of CANDIDATES) {
      const forward = scoreRun(buildRun(set.id, candidate.id));
      const backward = scoreRun([...buildRun(set.id, candidate.id)].reverse());
      assert.equal(backward.verdict, forward.verdict);
      assert.equal(backward.meanDelta, forward.meanDelta);
      assert.equal(backward.upper, forward.upper);
    }
  }
});

test("simulated presets land on the three verdicts", () => {
  const expected = {
    stable: "insufficient",
    subtle: "likely_regression",
    loops: "likely_regression",
    flaky: "invalid_run",
  };
  for (const set of SCENARIO_SETS) {
    for (const candidate of CANDIDATES) {
      const result = scoreRun(buildRun(set.id, candidate.id));
      assert.equal(result.verdict, expected[candidate.id], `${set.id}/${candidate.id}`);
    }
  }
});

test("the sample scorer ignores scenario hashes and does not name an interval method", () => {
  const result = scoreRun([
    scenario("hashed", {
      expectedHash: "abc",
      recordedHash: "def",
      baseline: { scheduled: 10, slots: Array.from({ length: 10 }, () => "pass") },
      candidate: { scheduled: 10, slots: Array.from({ length: 10 }, () => "pass") },
    }),
  ]);
  assert.equal("hashMismatch" in result.scenarios[0], false);
  assert.notEqual(result.verdict, "invalid_run");
  assert.doesNotMatch(result.why, /scenario hash|Invalid run/);
  const notes = Object.values(METHOD_NOTES).join("\n");
  assert.match(notes, /Simplified sample scorer, not the gate's statistic\./);
  assert.doesNotMatch(notes, /Jeffreys|normal approximation|Agresti|Wald/);
  assert.match(METHOD_NOTES.hashes, /harness validate/);
  assert.match(METHOD_NOTES.hashes, /exit 1/);
  assert.match(METHOD_NOTES.hashes, /does not treat a hash mismatch as an Invalid run/);
});

test("demo scenario hashes are the SHA-256 of the scenario text", () => {
  for (const set of SCENARIO_SETS) {
    for (const scenario of set.scenarios) {
      const hex = createHash("sha256").update(scenario.prompt).digest("hex");
      assert.equal(hex, scenario.expectedHash, scenario.id);
    }
  }
});

test("pooled interval on the pass-rate gap", () => {
  const cases = [
    { baseline: [390, 390], candidate: [390, 390], verdict: "no_regression", headline: "Pass", lower: -0.006, upper: 0.006, gap: 0 },
    { baseline: [470, 500], candidate: [469, 500], verdict: "no_regression", headline: "Pass", lower: -0.02717, upper: 0.02319, gap: -0.002 },
    { baseline: [88, 100], candidate: [86, 100], verdict: "insufficient", headline: "Insufficient evidence", lower: -0.0988, upper: 0.0596, gap: -0.02 },
    { baseline: [340, 390], candidate: [300, 390], verdict: "likely_regression", headline: "Block", lower: -0.147, upper: -0.057, gap: 300 / 390 - 340 / 390 },
    { baseline: [5, 5], candidate: [5, 5], verdict: "insufficient", headline: "Insufficient evidence", lower: -0.308, upper: 0.308, gap: 0 },
  ];
  for (const item of cases) {
    const result = scorePair(item.baseline, item.candidate);
    const label = `${item.baseline.join("/")} vs ${item.candidate.join("/")}`;
    assert.equal(result.verdict, item.verdict, label);
    assert.equal(result.headline, item.headline, label);
    assert.ok(Math.abs(result.lower - item.lower) < 1e-3, `${label} lower ${result.lower}`);
    assert.ok(Math.abs(result.upper - item.upper) < 1e-3, `${label} upper ${result.upper}`);
    assert.ok(Math.abs(result.meanDelta - item.gap) < 1e-12, `${label} gap ${result.meanDelta}`);
    assert.ok(result.lower >= -1 && result.upper <= 1, label);
  }

  const near = scorePair([100, 100], [90, 100]);
  assert.equal(near.verdict, "insufficient");
  assert.equal(near.headline, "Insufficient evidence");
  assert.ok(Math.abs(near.upper + 0.045) < 1e-3, near.upper);
  assert.ok(near.upper > -0.05, near.upper);
  assert.ok(near.lower < -0.05, near.lower);
  assert.ok(Math.abs(near.meanDelta + 0.1) < 1e-12);

  const forward = scorePair([470, 500], [469, 500]);
  const mirror = scorePair([469, 500], [470, 500]);
  assert.equal(mirror.verdict, "no_regression");
  assert.equal(mirror.headline, "Pass");
  assert.ok(forward.meanDelta < 0 && mirror.meanDelta > 0);
  assert.ok(Math.abs(mirror.meanDelta + forward.meanDelta) < 1e-12);
  assert.ok(Math.abs(mirror.lower + forward.upper) < 1e-12);
  assert.ok(Math.abs(mirror.upper + forward.lower) < 1e-12);
  assert.ok(mirror.lower > -0.05);

  const split = scoreRun([
    scenario("wide", { baseline: countedArm(10, 10), candidate: countedArm(10, 10) }),
    scenario("rest", { baseline: countedArm(78, 90), candidate: countedArm(76, 90) }),
  ]);
  const whole = scorePair([88, 100], [86, 100]);
  assert.equal(split.verdict, whole.verdict);
  assert.equal(split.lower, whole.lower);
  assert.equal(split.upper, whole.upper);
  assert.equal(split.meanDelta, whole.meanDelta);
});

function countedArm(passes, total) {
  return {
    scheduled: total,
    slots: [
      ...Array.from({ length: passes }, () => "pass"),
      ...Array.from({ length: total - passes }, () => "fail"),
    ],
  };
}

function scorePair(baseline, candidate) {
  return scoreRun([
    scenario("only", {
      baseline: countedArm(baseline[0], baseline[1]),
      candidate: countedArm(candidate[0], candidate[1]),
    }),
  ]);
}

function scenario(id, arms) {
  return { id, name: id, ...arms };
}
