(function exposeDeskSluggerRules(root, factory) {
  "use strict";

  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  if (root) root.DeskSluggerRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const HOME_RUN_REWARDS = Object.freeze([
    { min: 0, points: 200, title: "LOW EXIT", tier: 0, style: "chip", color: "#71b36b", rgb: "113,179,107" },
    { min: .12, points: 300, title: "LOW DRIVE", tier: 1, style: "dust", color: "#e0c49b", rgb: "224,196,155" },
    { min: .22, points: 500, title: "RISING DRIVE", tier: 2, style: "slice", color: "#ffad5c", rgb: "255,173,92" },
    { min: .32, points: 700, title: "HIGH DRIVE", tier: 3, style: "pulse", color: "#f1cf57", rgb: "241,207,87" },
    { min: .42, points: 1000, title: "SKY SHOT", tier: 4, style: "spiral", color: "#55c3d4", rgb: "85,195,212" },
    { min: .52, points: 1200, title: "UPPER DECK", tier: 5, style: "prism", color: "#bda2ff", rgb: "189,162,255" },
    { min: .64, points: 1500, title: "ZENITH", tier: 6, style: "nova", color: "#ffffff", rgb: "255,255,255" },
    { min: .74, points: 2000, title: "ASCENSION", tier: 7, style: "plane", color: "#b7f5ff", rgb: "183,245,255" },
    { min: .84, points: 3000, title: "BEYOND", tier: 8, style: "moon", color: "#ffe9a6", rgb: "255,233,166" }
  ].map(Object.freeze));

  const BAT_TIER_UNLOCKS = Object.freeze([
    { min: 0, name: "IRON", accuracy: 0, power: 0 },
    { min: 2000, name: "BRONZE", accuracy: .006, power: .008 },
    { min: 5000, name: "SILVER", accuracy: .013, power: .017 },
    { min: 9000, name: "GOLD", accuracy: .021, power: .028 },
    { min: 14000, name: "PLATINUM", accuracy: .03, power: .04 },
    { min: 20000, name: "EMERALD", accuracy: .04, power: .053 },
    { min: 28000, name: "DIAMOND", accuracy: .052, power: .067 },
    { min: 38000, name: "MASTER", accuracy: .065, power: .082 },
    { min: 50000, name: "GRANDMASTER", accuracy: .079, power: .098 },
    { min: 65000, name: "CHALLENGER", accuracy: .095, power: .115 }
  ].map(Object.freeze));

  const FLIGHT_PHYSICS = Object.freeze({
    referenceWidth: 1920,
    referenceHeight: 1080,
    gravity: 1080 * 1.08,
    fixedStep: 1 / 120,
    airDrag: .035,
    backspinLift: .18,
    topspinDrop: .06
  });
  const LUCKY_HIT_CHANCE = .01;
  const LUCKY_LAUNCH_DEGREES = 48;
  const LUCKY_HIT_PROFILE = Object.freeze({
    quality: 1,
    power: 1,
    launchDegrees: LUCKY_LAUNCH_DEGREES,
    loftAssist: 1,
    carry: 1,
    verticalBonus: .32,
    backspin: .92
  });

  function compareVersions(left, right) {
    const a = String(left).split(".").map((part) => Number(part) || 0);
    const b = String(right).split(".").map((part) => Number(part) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
      if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
    }
    return 0;
  }

  function edgeReward(edgeHeight) {
    const height = Number(edgeHeight) || 0;
    for (let index = HOME_RUN_REWARDS.length - 1; index >= 0; index--) {
      if (height >= HOME_RUN_REWARDS[index].min) return HOME_RUN_REWARDS[index];
    }
    return HOME_RUN_REWARDS[0];
  }

  function scoreForBall(ball, field) {
    if (Number.isFinite(ball.edgeHeight)) return edgeReward(ball.edgeHeight).points;
    if (ball.contactType === "GROUNDER" || ball.grounded) return 100;
    const normalizedHeight = (Number(ball.maxHeight) || 0) / Math.max(1, Number(field.playHeight) || 0);
    const furthestX = Math.max(Number(ball.x) || 0, Number(ball.predictedX) || 0);
    const normalizedX = (furthestX - (Number(field.primaryX) || 0)) / Math.max(1, Number(field.playWidth) || 0);
    if (normalizedHeight > .43) return 1000;
    if (normalizedHeight > .27) return 500;
    if (normalizedHeight > .15) return 300;
    if (normalizedX > .72) return 200;
    return 100;
  }

  function pitchStageForScore(score) {
    const value = Math.max(0, Number(score) || 0);
    if (value < 500) return 0;
    if (value < 1000) return 1;
    if (value < 2000) return 2;
    if (value < 3000) return 3;
    if (value < 4000) return 4;
    if (value < 5000) return 5;
    if (value < 10000) return 6;
    return 7;
  }

  function difficultyPointsForHit(points) {
    return Math.min(700, Math.max(0, Number(points) || 0));
  }

  function pitchMomentumBonus(speed) {
    const value = Math.max(0, Number(speed) || 0);
    return Math.min(.08, Math.max(0, (value - 360) / 740 * .08));
  }

  function isLuckyHit(randomValue) {
    const roll = Number(randomValue);
    return Number.isFinite(roll) && roll >= 0 && roll < LUCKY_HIT_CHANCE;
  }

  function advanceFlight(state, duration) {
    const x = Number(state.x) || 0;
    const z = Number(state.z) || 0;
    const vx = Number(state.vx) || 0;
    const vz = Number(state.vz) || 0;
    const gravityScale = Math.max(.2, Number(state.gravityScale) || 1);
    const backspin = Math.max(-1, Math.min(1, Number(state.backspin) || 0));
    const dt = Math.max(0, Number(duration) || 0);
    const initialSpeed = Math.max(0, Number(state.aeroSpeed) || Math.hypot(vx, vz));
    const speedRatio = Math.max(.25, Math.min(1.2, initialSpeed / 900));
    const dragRate = Math.max(1e-6, Number(state.dragRate)
      || FLIGHT_PHYSICS.airDrag * Math.max(.45, Math.min(1.35, initialSpeed / 900)));
    const liftAcceleration = Number.isFinite(state.liftAcceleration)
      ? state.liftAcceleration
      : FLIGHT_PHYSICS.gravity * (
        FLIGHT_PHYSICS.backspinLift * Math.max(0, backspin)
        - FLIGHT_PHYSICS.topspinDrop * Math.max(0, -backspin)
      ) * speedRatio;
    const verticalAcceleration = -FLIGHT_PHYSICS.gravity * gravityScale + liftAcceleration;
    const decay = Math.exp(-dragRate * dt);
    const accelerationVelocity = verticalAcceleration / dragRate;
    const distanceFactor = (1 - decay) / dragRate;
    const nextVx = vx * decay;
    const nextVz = vz * decay + accelerationVelocity * (1 - decay);
    const nextX = x + vx * distanceFactor;
    const nextZ = z + (vz - accelerationVelocity) * distanceFactor + accelerationVelocity * dt;
    return {
      x: nextX, z: nextZ, vx: nextVx, vz: nextVz,
      gravityScale, backspin, aeroSpeed: initialSpeed, dragRate, liftAcceleration
    };
  }

  function predictFloorContact(state, floor = 0, maxSeconds = 8) {
    let elapsed = 0;
    let current = { ...state };
    const limit = Math.max(0, Number(maxSeconds) || 0);
    if ((Number(current.z) || 0) <= floor) return { ...current, time: 0 };
    while (elapsed < limit) {
      const dt = Math.min(FLIGHT_PHYSICS.fixedStep, limit - elapsed);
      const next = advanceFlight(current, dt);
      if (next.z <= floor) {
        let low = 0;
        let high = dt;
        for (let index = 0; index < 14; index++) {
          const middle = (low + high) * .5;
          if (advanceFlight(current, middle).z > floor) low = middle;
          else high = middle;
        }
        const contact = advanceFlight(current, high);
        return {
          ...contact,
          z: floor,
          time: elapsed + high
        };
      }
      current = next;
      elapsed += dt;
    }
    return null;
  }

  function batTierIndexForScore(score) {
    const value = Math.max(0, Number(score) || 0);
    for (let index = BAT_TIER_UNLOCKS.length - 1; index >= 0; index--) {
      if (value >= BAT_TIER_UNLOCKS[index].min) return index;
    }
    return 0;
  }

  return Object.freeze({
    HOME_RUN_REWARDS,
    BAT_TIER_UNLOCKS,
    FLIGHT_PHYSICS,
    LUCKY_HIT_CHANCE,
    LUCKY_LAUNCH_DEGREES,
    LUCKY_HIT_PROFILE,
    compareVersions,
    edgeReward,
    scoreForBall,
    pitchStageForScore,
    difficultyPointsForHit,
    pitchMomentumBonus,
    isLuckyHit,
    advanceFlight,
    predictFloorContact,
    batTierIndexForScore
  });
});
