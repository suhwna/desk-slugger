"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../game-rules.js");

const field = { primaryX: 0, playWidth: 1000, playHeight: 1000 };

test("semantic versions compare numerically", () => {
  assert.equal(rules.compareVersions("0.7.50", "0.7.49") > 0, true);
  assert.equal(rules.compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(rules.compareVersions("1.0.9", "1.0.10") < 0, true);
});

test("pitch difficulty changes at every documented score boundary", () => {
  const cases = [
    [0, 0], [499, 0], [500, 1], [999, 1], [1000, 2], [1999, 2],
    [2000, 3], [2999, 3], [3000, 4], [3999, 4], [4000, 5],
    [4999, 5], [5000, 6], [9999, 6], [10000, 7]
  ];
  for (const [score, stage] of cases) assert.equal(rules.pitchStageForScore(score), stage, String(score));
});

test("right-edge rewards cover all nine height tiers", () => {
  const heights = [0, .12, .22, .32, .42, .52, .64, .74, .84];
  const points = [200, 300, 500, 700, 1000, 1200, 1500, 2000, 3000];
  assert.deepEqual(heights.map((height) => rules.edgeReward(height).points), points);
});

test("non-boundary hits use distinct 100, 200, 300, 500 and 1000 point bands", () => {
  const ball = (overrides = {}) => ({
    x: 300, predictedX: 300, maxHeight: 0, contactType: "LINER", grounded: false,
    edgeHeight: null, ...overrides
  });
  assert.equal(rules.scoreForBall(ball({ grounded: true }), field), 100);
  assert.equal(rules.scoreForBall(ball({ x: 730, predictedX: 730, maxHeight: 140 }), field), 200);
  assert.equal(rules.scoreForBall(ball({ maxHeight: 151 }), field), 300);
  assert.equal(rules.scoreForBall(ball({ maxHeight: 271 }), field), 500);
  assert.equal(rules.scoreForBall(ball({ maxHeight: 431 }), field), 1000);
});

test("boundary score always wins over ordinary hit classification", () => {
  assert.equal(rules.scoreForBall({ edgeHeight: .84, grounded: true }, field), 3000);
});

test("a single hit contributes at most 700 points to pitcher difficulty", () => {
  assert.equal(rules.difficultyPointsForHit(100), 100);
  assert.equal(rules.difficultyPointsForHit(700), 700);
  assert.equal(rules.difficultyPointsForHit(1000), 700);
  assert.equal(rules.difficultyPointsForHit(3000), 700);
  assert.equal(rules.difficultyPointsForHit(-100), 0);
});

test("premium hits advance pitcher difficulty gradually instead of skipping tiers", () => {
  let difficulty = 0;
  difficulty += rules.difficultyPointsForHit(3000);
  assert.equal(rules.pitchStageForScore(difficulty), 1);
  difficulty += rules.difficultyPointsForHit(2000);
  assert.equal(rules.pitchStageForScore(difficulty), 2);
  difficulty += rules.difficultyPointsForHit(1000);
  assert.equal(rules.pitchStageForScore(difficulty), 3);
});

test("bat tiers use the rebalanced long-term score thresholds", () => {
  const thresholds = [0, 2000, 5000, 9000, 14000, 20000, 28000, 38000, 50000, 65000];
  assert.deepEqual(rules.BAT_TIER_UNLOCKS.map((tier) => tier.min), thresholds);
  thresholds.forEach((threshold, index) => {
    assert.equal(rules.batTierIndexForScore(threshold), index, String(threshold));
    if (index > 0) assert.equal(rules.batTierIndexForScore(threshold - 1), index - 1, String(threshold - 1));
  });
});

test("one maximum-value hit unlocks bronze but no higher bat tier", () => {
  assert.equal(rules.batTierIndexForScore(3000), 1);
});

test("bat performance rises every tier and remains skill-based", () => {
  const tiers = rules.BAT_TIER_UNLOCKS;
  for (let index = 1; index < tiers.length; index++) {
    assert.ok(tiers[index].accuracy > tiers[index - 1].accuracy, `${tiers[index].name} accuracy`);
    assert.ok(tiers[index].power > tiers[index - 1].power, `${tiers[index].name} power`);
  }
  assert.equal(tiers.at(-1).accuracy, .095);
  assert.equal(tiers.at(-1).power, .115);
});

test("faster pitches add up to eight percent batted-ball momentum", () => {
  assert.equal(rules.pitchMomentumBonus(360), 0);
  assert.ok(Math.abs(rules.pitchMomentumBonus(545) - .02) < 1e-9);
  assert.ok(Math.abs(rules.pitchMomentumBonus(730) - .04) < 1e-9);
  assert.ok(Math.abs(rules.pitchMomentumBonus(915) - .06) < 1e-9);
  assert.equal(rules.pitchMomentumBonus(1100), .08);
  assert.equal(rules.pitchMomentumBonus(1800), .08);
});

test("analytic flight is invariant across render frame rates", () => {
  const initial = {
    x: 180, z: 14, vx: 1180, vz: 610, gravityScale: .94, backspin: .62,
    aeroSpeed: 1328, dragRate: .046, liftAcceleration: 185
  };
  const direct = rules.advanceFlight(initial, 1.25);
  const stepped = (fps) => {
    let state = initial;
    let remaining = 1.25;
    while (remaining > 1e-12) {
      const dt = Math.min(1 / fps, remaining);
      state = rules.advanceFlight(state, dt);
      remaining -= dt;
    }
    return state;
  };
  for (const fps of [30, 60, 144, 240]) {
    const state = stepped(fps);
    assert.ok(Math.abs(state.x - direct.x) < 1e-7, `${fps}fps x`);
    assert.ok(Math.abs(state.z - direct.z) < 1e-7, `${fps}fps z`);
    assert.ok(Math.abs(state.vx - direct.vx) < 1e-7, `${fps}fps vx`);
    assert.ok(Math.abs(state.vz - direct.vz) < 1e-7, `${fps}fps vz`);
  }
});

test("virtual stadium projection preserves normalized height on every display", () => {
  const state = rules.advanceFlight({ x: 192, z: 14, vx: 1050, vz: 590, gravityScale: .96, backspin: .35 }, .7);
  const displays = [[1920, 1080], [1920, 1200], [3440, 1440], [3840, 2160]];
  const normalized = displays.map(([, height]) => {
    const scaleY = height / rules.FLIGHT_PHYSICS.referenceHeight;
    return state.z * scaleY / height;
  });
  normalized.forEach((height) => assert.ok(Math.abs(height - normalized[0]) < 1e-12));
});

test("air drag slows the ball and backspin supplies bounded lift", () => {
  const base = { x: 0, z: 10, vx: 1100, vz: 500, gravityScale: 1, aeroSpeed: 1208, dragRate: .04 };
  const neutral = rules.advanceFlight({ ...base, backspin: 0, liftAcceleration: 0 }, .8);
  const lifted = rules.advanceFlight({ ...base, backspin: .8, liftAcceleration: 180 }, .8);
  assert.ok(neutral.vx < base.vx);
  assert.ok(lifted.z > neutral.z);
  assert.ok(lifted.vz > neutral.vz);
});

test("floor contact solver returns the exact floor without tunneling", () => {
  const contact = rules.predictFloorContact({ x: 200, z: 90, vx: 700, vz: -250, gravityScale: 1, backspin: 0 }, 2.7, 2);
  assert.ok(contact);
  assert.ok(Math.abs(contact.z - 2.7) < 1e-12);
  assert.ok(contact.time > 0 && contact.time < 2);
});

test("lucky contact has an exact one-percent boundary and maximum profile", () => {
  assert.equal(rules.LUCKY_HIT_CHANCE, .01);
  assert.equal(rules.isLuckyHit(0), true);
  assert.equal(rules.isLuckyHit(.009999999), true);
  assert.equal(rules.isLuckyHit(.01), false);
  assert.equal(rules.isLuckyHit(.5), false);
  assert.equal(rules.LUCKY_HIT_PROFILE.power, 1);
  assert.equal(rules.LUCKY_HIT_PROFILE.quality, 1);
  assert.equal(rules.LUCKY_HIT_PROFILE.launchDegrees, 48);
  assert.equal(rules.LUCKY_HIT_PROFILE.loftAssist, 1);
  assert.equal(rules.LUCKY_HIT_PROFILE.carry, 1);
  assert.equal(rules.LUCKY_HIT_PROFILE.verticalBonus, .32);
  assert.equal(rules.LUCKY_HIT_PROFILE.backspin, .92);
});
