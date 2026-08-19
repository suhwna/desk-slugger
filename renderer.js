(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const gameOverPanel = document.querySelector("#gameOver");
  const gameOverReason = document.querySelector("#gameOverReason");
  const scoreLabel = document.querySelector(".score-label");
  const finalScoreOutput = document.querySelector("#finalScore");
  const rankingStatus = document.querySelector("#rankingStatus");
  const rankingForm = document.querySelector("#rankingForm");
  const rankingList = document.querySelector("#rankingList");
  const nicknameInput = document.querySelector("#nickname");
  const submitScoreButton = document.querySelector("#submitScore");
  const restartButton = document.querySelector("#restartGame");

  const colors = {
    cream: "#f4f0e4", red: "#ef5144", yellow: "#f1cf57",
    blue: "#55c3d4", green: "#71b36b"
  };
  const ANIMATION_FPS = 12;
  const CATCH_RECEIVE_END = .42;
  const CATCH_RELEASE_AT = 1.04;
  const RETURN_ARRIVE_AT = 1.72;
  const RETURN_END = 2.18;
  const GLOVE_HAND = "handL";
  const THROWING_HAND = "handR";
  const PITCHER_RECEIVE_START = 1.04;
  const PITCHER_TRANSFER_DURATION = .56;
  const BAT_READY_YAW = 1.04;
  const BAT_READY_PITCH = .58;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const smooth = (value) => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  // Key poses are authored on a 12 FPS timing grid, but interpolation runs at
  // the monitor refresh rate. Smear references remain sampled at 12 FPS.
  const stepTime = (seconds) => seconds;
  const HITTING = {
    minTipSpeed: 46,
    forwardTipSpeed: 30,
    cursorForwardRatio: .095,
    earliestPitchT: .36,
    latestPitchT: 1.16,
    contactPadding: 24,
    // Keep only a sub-animation-frame of leniency. A long trail made the ball
    // collide with a bat position that was no longer on screen, so the hit
    // flash could appear just before/after the visible barrel reached it.
    timingMemory: .075
  };
  const BAT_TIERS = [
    { min: 0, name: "IRON", accuracy: 0, power: 0, rim: [35, 38, 42], handle: [72, 76, 82], middle: [116, 122, 130], tip: [157, 164, 173], shine: [211, 216, 222] },
    { min: 500, name: "BRONZE", accuracy: .005, power: .006, rim: [62, 31, 18], handle: [111, 56, 31], middle: [181, 99, 52], tip: [222, 140, 79], shine: [255, 197, 128] },
    { min: 1000, name: "SILVER", accuracy: .01, power: .012, rim: [57, 65, 73], handle: [103, 113, 123], middle: [169, 180, 190], tip: [219, 227, 234], shine: [255, 255, 255] },
    { min: 2000, name: "GOLD", accuracy: .015, power: .018, rim: [82, 54, 6], handle: [143, 91, 12], middle: [225, 167, 30], tip: [255, 220, 79], shine: [255, 246, 175] },
    { min: 3000, name: "PLATINUM", accuracy: .02, power: .024, rim: [52, 74, 82], handle: [99, 133, 143], middle: [166, 204, 210], tip: [223, 247, 245], shine: [255, 255, 255] },
    { min: 4000, name: "EMERALD", accuracy: .025, power: .03, rim: [10, 66, 44], handle: [17, 105, 68], middle: [30, 178, 113], tip: [83, 235, 159], shine: [190, 255, 222] },
    { min: 5000, name: "DIAMOND", accuracy: .03, power: .036, rim: [35, 75, 101], handle: [66, 127, 160], middle: [111, 205, 233], tip: [205, 249, 255], shine: [255, 255, 255] },
    { min: 7000, name: "MASTER", accuracy: .035, power: .042, rim: [60, 26, 104], handle: [101, 46, 157], middle: [167, 83, 225], tip: [222, 148, 255], shine: [249, 221, 255] },
    { min: 10000, name: "GRANDMASTER", accuracy: .04, power: .048, rim: [87, 11, 23], handle: [139, 20, 39], middle: [222, 49, 67], tip: [255, 125, 67], shine: [255, 224, 116] },
    { min: 15000, name: "CHALLENGER", accuracy: .045, power: .054, rim: [30, 34, 76], handle: [69, 73, 177], middle: [49, 210, 213], tip: [244, 99, 222], shine: [255, 255, 255] }
  ];
  const HIT_STRENGTHS = [
    { key: "MISHIT", label: "빗맞음", max: .41, lines: 3, particles: 2, rings: 1, scale: .58, freeze: .4, shake: .8, color: colors.cream, glow: .08 },
    { key: "SOFT", label: "약타", max: .51, lines: 5, particles: 4, rings: 1, scale: .72, freeze: .75, shake: 1.45, color: colors.cream, glow: .13 },
    { key: "NORMAL", label: "보통", max: .62, lines: 8, particles: 7, rings: 1, scale: .9, freeze: 1.15, shake: 2.6, color: colors.yellow, glow: .2 },
    { key: "HARD", label: "강타", max: .75, lines: 12, particles: 12, rings: 2, scale: 1.08, freeze: 1.9, shake: 4.7, color: colors.yellow, glow: .3 },
    { key: "BARREL", label: "배럴", max: .89, lines: 18, particles: 19, rings: 2, scale: 1.3, freeze: 3.15, shake: 7.8, color: "#ffe58a", glow: .46 },
    { key: "PERFECT", label: "퍼펙트", max: 1, lines: 26, particles: 29, rings: 3, scale: 1.52, freeze: 4.5, shake: 13.5, color: "#ffffff", glow: .68 }
  ];
  const BATTED_TRAJECTORIES = [
    { key: "TOPPED", label: "찍힌 타구", max: 3, spread: .18, ringSquash: .3, curve: .02, gravity: 260, accent: colors.red },
    { key: "GROUNDER", label: "땅볼", max: 10, spread: .12, ringSquash: .24, curve: .01, gravity: 220, accent: "#d7b990" },
    { key: "LOW_LINER", label: "낮은 라이너", max: 18, spread: .08, ringSquash: .2, curve: 0, gravity: 145, accent: colors.yellow },
    { key: "LINER", label: "라인드라이브", max: 27, spread: .13, ringSquash: .28, curve: 0, gravity: 105, accent: "#fff0a6" },
    { key: "HIGH_LINER", label: "높은 라이너", max: 36, spread: .2, ringSquash: .35, curve: -.025, gravity: 78, accent: colors.yellow },
    { key: "LOW_FLY", label: "낮은 뜬공", max: 44, spread: .28, ringSquash: .43, curve: -.07, gravity: 52, accent: colors.blue },
    { key: "HIGH_FLY", label: "높은 뜬공", max: 52, spread: .36, ringSquash: .52, curve: -.11, gravity: 28, accent: colors.blue },
    { key: "MOONSHOT", label: "문샷", max: 65, spread: .45, ringSquash: .62, curve: -.16, gravity: 8, accent: "#ffffff" }
  ];
  const HOME_RUN_REWARDS = [
    { min: 0, points: 200, title: "LOW EXIT", tier: 0, style: "chip", color: colors.green, rgb: "113,179,107" },
    { min: .12, points: 300, title: "LOW DRIVE", tier: 1, style: "dust", color: "#e0c49b", rgb: "224,196,155" },
    { min: .22, points: 500, title: "RISING DRIVE", tier: 2, style: "slice", color: "#ffad5c", rgb: "255,173,92" },
    { min: .32, points: 700, title: "HIGH DRIVE", tier: 3, style: "pulse", color: colors.yellow, rgb: "241,207,87" },
    { min: .42, points: 1000, title: "SKY SHOT", tier: 4, style: "spiral", color: colors.blue, rgb: "85,195,212" },
    { min: .52, points: 1200, title: "UPPER DECK", tier: 5, style: "prism", color: "#bda2ff", rgb: "189,162,255" },
    { min: .64, points: 1500, title: "ZENITH", tier: 6, style: "nova", color: "#ffffff", rgb: "255,255,255" }
  ];

  let width = innerWidth;
  let height = innerHeight;
  let desktopLayout = {
    primaryX: 0,
    primaryY: 0,
    primaryWidth: width,
    primaryHeight: height,
    displays: [{ id: "primary", primary: true, x: 0, y: 0, width, height, scaleFactor: 1 }]
  };
  let neutralX = width * .5;
  let neutralY = height * .5;
  let lastFrame = performance.now();
  let phase = "waiting";
  let phaseTime = 0;
  let paused = false;
  let score = 0;
  let personalBest = Math.max(0, Number.parseInt(localStorage.getItem("desk-slugger-personal-best") || "0", 10) || 0);
  let strikes = 0;
  let pitchNumber = 0;
  let nextPitchDelay = 1.25;
  let pitchClock = -1;
  let ball = null;
  let defenders = [];
  let particles = [];
  let feedbacks = [];
  let impactLines = [];
  let impactRings = [];
  let edgeBlasts = [];
  let shake = 0;
  let impactFreeze = 0;
  let impactFreezeMax = 0;
  let impactPunch = null;
  let lastOutcome = "";
  let catcherState = "ready";
  let catcherTime = 0;
  let visualTick = -1;
  let displayBat = null;
  let previousDisplayBat = null;
  let displayBall = null;
  let previousDisplayBall = null;
  let physicsBat = null;
  let previousPhysicsBat = null;
  let impactDisplayBat = null;
  let batContactTrail = [];
  let swingConsumed = false;
  let rankingRequestToken = 0;
  let scoreSubmitted = false;
  let rankingOnlyOpen = false;
  let rankingPreviousPaused = false;
  let effectPreviewUntil = 0;
  let effectPreviewTimers = [];

  const cursor = {
    x: width * .5, y: height * .5,
    targetX: width * .5, targetY: height * .5,
    rawX: width * .5, rawY: height * .5,
    vx: 0, vy: 0, speed: 0,
    rawVx: 0, rawVy: 0, rawSpeed: 0, at: 0
  };
  const bat3d = {
    // The supplied reference starts with the barrel rising to screen-right
    // from hands held left of the head. Moving left first creates the load.
    yaw: BAT_READY_YAW, pitch: BAT_READY_PITCH,
    targetYaw: BAT_READY_YAW, targetPitch: BAT_READY_PITCH,
    yawVelocity: 0, pitchVelocity: 0,
    followThrough: 0,
    tipSpeed: 0, tipVx: 0, tipVy: 0, previousTip: null
  };
  const swing = {
    phase: "ready", time: 0, progress: 0, startYaw: BAT_READY_YAW,
    peakSpeed: 0, contactSpeed: 0, contactVx: 0, contactVy: 0,
    load: 0, outcome: ""
  };

  function activeBatTier() {
    const record = Math.max(personalBest, score);
    for (let index = BAT_TIERS.length - 1; index >= 0; index--) {
      if (record >= BAT_TIERS[index].min) return BAT_TIERS[index];
    }
    return BAT_TIERS[0];
  }

  function setPersonalBest(value) {
    const nextBest = Math.max(0, Number(value) || 0);
    if (nextBest <= personalBest) return;
    personalBest = nextBest;
    localStorage.setItem("desk-slugger-personal-best", String(personalBest));
  }

  function savePersonalBest() {
    setPersonalBest(score);
  }

  async function syncPersonalBestFromRanking() {
    const nickname = localStorage.getItem("desk-slugger-nickname")?.trim();
    if (!nickname) return;
    try {
      const result = await window.desktopGame.rankingList();
      const matchingScores = (result?.ranking || [])
        .filter((entry) => String(entry.nickname).trim() === nickname)
        .map((entry) => Number(entry.score) || 0);
      if (matchingScores.length) setPersonalBest(Math.max(...matchingScores));
    } catch {
      // Local progression remains available when the LAN ranking server is off.
    }
  }

  function batColor(rgb, depth = 0) {
    const factor = 1 + (depth >= 0 ? depth * .22 : depth * .3);
    return `rgb(${rgb.map((channel) => Math.round(clamp(channel * factor, 0, 255))).join(",")})`;
  }

  function scene() {
    const primaryX = desktopLayout.primaryX || 0;
    const primaryY = desktopLayout.primaryY || 0;
    const playWidth = desktopLayout.primaryWidth || width;
    const playHeight = desktopLayout.primaryHeight || height;
    const unit = clamp(Math.min(playWidth / 1920, playHeight / 1080), .72, 1.35);
    const actorScale = .28 * unit;
    const ground = primaryY + playHeight - 1 * unit;
    const batterX = primaryX + playWidth * .1;
    const displays = desktopLayout.displays || [];
    return {
      unit, actorScale, ground,
      primaryX, primaryY, playWidth, playHeight,
      primaryRight: primaryX + playWidth,
      primaryBottom: primaryY + playHeight,
      worldRight: primaryX + playWidth,
      displays,
      wallX: primaryX + playWidth - 18 * unit,
      batter: { x: batterX },
      catcher: { x: batterX - 34 * unit },
      pitcher: { x: primaryX + playWidth * .3 },
      fielders: defenders
    };
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!defenders.length) resetDefenders();
  }

  function centerBatControl() {
    cursor.x = cursor.targetX = neutralX;
    cursor.y = cursor.targetY = neutralY;
    bat3d.yaw = bat3d.targetYaw = BAT_READY_YAW;
    bat3d.pitch = bat3d.targetPitch = BAT_READY_PITCH;
    bat3d.tipVx = 0;
    bat3d.tipVy = 0;
    bat3d.tipSpeed = 0;
    bat3d.followThrough = 0;
    bat3d.previousTip = null;
    physicsBat = null;
    previousPhysicsBat = null;
    batContactTrail = [];
  }

  function resetDefenders() {
    defenders = [];
  }

  function resetSwing() {
    swing.phase = "ready";
    swing.time = 0;
    swing.progress = 0;
    swing.startYaw = BAT_READY_YAW;
    swing.peakSpeed = 0;
    swing.contactSpeed = 0;
    swing.contactVx = 0;
    swing.contactVy = 0;
    swing.load = 0;
    swing.outcome = "";
    batContactTrail = [];
  }

  function resetGame() {
    rankingOnlyOpen = false;
    score = 0;
    strikes = 0;
    pitchNumber = 0;
    particles = [];
    feedbacks = [];
    impactLines = [];
    impactRings = [];
    edgeBlasts = [];
    ball = null;
    phase = "waiting";
    phaseTime = 0;
    pitchClock = -1;
    nextPitchDelay = .7;
    lastOutcome = "";
    catcherState = "ready";
    catcherTime = 0;
    impactFreeze = 0;
    impactFreezeMax = 0;
    impactPunch = null;
    swingConsumed = false;
    resetSwing();
    resetDefenders();
    centerBatControl();
    rankingRequestToken++;
    scoreSubmitted = false;
    effectPreviewUntil = 0;
    effectPreviewTimers.forEach(clearTimeout);
    effectPreviewTimers = [];
    rankingForm.hidden = true;
    rankingList.hidden = true;
    rankingList.replaceChildren();
    gameOverPanel.classList.remove("ranking-only");
    scoreLabel.hidden = false;
    finalScoreOutput.hidden = false;
    restartButton.textContent = "다시 하기";
    nicknameInput.disabled = false;
    submitScoreButton.disabled = false;
    rankingStatus.className = "ranking-status";
    rankingStatus.textContent = "랭킹 확인 중";
    document.body.classList.remove("result-open");
    gameOverPanel.hidden = true;
    window.desktopGame.setInteractive(false);
  }

  function setRankingStatus(message, state = "") {
    rankingStatus.className = `ranking-status${state ? ` ${state}` : ""}`;
    rankingStatus.textContent = message;
  }

  function renderRanking(entries = [], ownEntryId = null) {
    rankingList.replaceChildren();
    for (let index = 0; index < 10; index++) {
      const entry = entries[index] || null;
      const row = document.createElement("li");
      if (entry && ownEntryId !== null && Number(entry.id) === Number(ownEntryId)) row.classList.add("is-me");
      const rank = document.createElement("span");
      rank.className = "rank-number";
      rank.textContent = `${index + 1}`;
      const name = document.createElement("span");
      name.className = "rank-name";
      name.textContent = entry?.nickname || "—";
      const points = document.createElement("span");
      points.className = "rank-score";
      points.textContent = entry ? Number(entry.score).toLocaleString() : "—";
      row.append(rank, name, points);
      rankingList.append(row);
    }
    rankingList.hidden = false;
  }

  async function loadRankingList(ownEntryId = null, token = null) {
    const result = await window.desktopGame.rankingList();
    if (token !== null && token !== rankingRequestToken) return;
    renderRanking(result?.ranking || [], ownEntryId);
  }

  async function showStandaloneRanking() {
    if (rankingOnlyOpen) return;
    if (phase === "gameover") {
      const token = ++rankingRequestToken;
      rankingForm.hidden = true;
      rankingList.hidden = true;
      setRankingStatus("TOP 10 불러오는 중");
      try {
        await loadRankingList(null, token);
        if (token === rankingRequestToken) setRankingStatus("TOP 10", "success");
      } catch {
        if (token === rankingRequestToken) setRankingStatus("랭킹 서버 연결 실패", "failed");
      }
      return;
    }

    rankingOnlyOpen = true;
    rankingPreviousPaused = paused;
    paused = true;
    const token = ++rankingRequestToken;
    gameOverPanel.classList.add("ranking-only");
    gameOverReason.textContent = "RANKING";
    scoreLabel.hidden = true;
    finalScoreOutput.hidden = true;
    rankingForm.hidden = true;
    rankingList.hidden = true;
    rankingList.replaceChildren();
    restartButton.textContent = "닫기";
    setRankingStatus("TOP 10 불러오는 중");
    document.body.classList.add("result-open");
    gameOverPanel.hidden = false;
    window.desktopGame.setInteractive(true);
    try {
      await loadRankingList(null, token);
      if (token === rankingRequestToken && rankingOnlyOpen) setRankingStatus("TOP 10", "success");
    } catch {
      if (token === rankingRequestToken && rankingOnlyOpen) setRankingStatus("랭킹 서버 연결 실패", "failed");
    }
    setTimeout(() => restartButton.focus(), 40);
  }

  function closeStandaloneRanking() {
    if (!rankingOnlyOpen) return;
    rankingOnlyOpen = false;
    rankingRequestToken++;
    paused = rankingPreviousPaused;
    gameOverPanel.classList.remove("ranking-only");
    gameOverPanel.hidden = true;
    rankingList.hidden = true;
    rankingList.replaceChildren();
    scoreLabel.hidden = false;
    finalScoreOutput.hidden = false;
    restartButton.textContent = "다시 하기";
    document.body.classList.remove("result-open");
    window.desktopGame.setInteractive(false);
  }

  function handleResultButton() {
    if (rankingOnlyOpen) closeStandaloneRanking();
    else resetGame();
  }

  async function prepareRankingEntry() {
    const token = ++rankingRequestToken;
    rankingForm.hidden = true;
    rankingList.hidden = true;
    setRankingStatus("랭킹 확인 중");
    try {
      const result = await window.desktopGame.rankingQualify(score);
      if (token !== rankingRequestToken || phase !== "gameover") return;
      if (!result.qualified) {
        setRankingStatus(`랭킹 등록 실패 · ${result.rank}위`, "failed");
        try { await loadRankingList(null, token); } catch { setRankingStatus(`랭킹 등록 실패 · ${result.rank}위 · 목록 연결 실패`, "failed"); }
        return;
      }
      setRankingStatus(`TOP 10 · 예상 ${result.rank}위`, "success");
      rankingForm.hidden = false;
      const savedNickname = localStorage.getItem("desk-slugger-nickname");
      if (savedNickname) nicknameInput.value = savedNickname;
      setTimeout(() => nicknameInput.focus(), 40);
    } catch {
      if (token !== rankingRequestToken || phase !== "gameover") return;
      setRankingStatus("랭킹 서버 연결 실패", "failed");
    }
  }

  async function submitRanking(event) {
    event.preventDefault();
    if (scoreSubmitted || phase !== "gameover") return;
    const nickname = nicknameInput.value.trim();
    if (!/^[\p{L}\p{N}_ -]{1,12}$/u.test(nickname)) {
      setRankingStatus("닉네임은 1~12자로 입력", "failed");
      nicknameInput.focus();
      return;
    }
    nicknameInput.disabled = true;
    submitScoreButton.disabled = true;
    setRankingStatus("랭킹 등록 중");
    const token = rankingRequestToken;
    try {
      const result = await window.desktopGame.submitScore(nickname, score);
      if (token !== rankingRequestToken || phase !== "gameover") return;
      if (!result?.ok) {
        rankingForm.hidden = true;
        setRankingStatus(`랭킹 등록 실패 · ${result.rank}위`, "failed");
        try { await loadRankingList(null, token); } catch { setRankingStatus(`랭킹 등록 실패 · ${result.rank}위 · 목록 연결 실패`, "failed"); }
        return;
      }
      scoreSubmitted = true;
      localStorage.setItem("desk-slugger-nickname", nickname);
      rankingForm.hidden = true;
      setRankingStatus(`등록 완료 · ${result.rank}위`, "success");
      renderRanking(result.ranking || [], result.entryId);
      restartButton.focus();
    } catch {
      if (token !== rankingRequestToken || phase !== "gameover") return;
      nicknameInput.disabled = false;
      submitScoreButton.disabled = false;
      setRankingStatus("등록 실패 · 서버 연결 확인", "failed");
    }
  }

  function pitchPreset() {
    const pitches = {
      slowFast: {
        name: "SLOW FAST", duration: [1.02, 1.16], curve: [-1.2, 1.2], late: [-.8, .8],
        depth: [-2, 2], acceleration: .04
      },
      fast: {
        name: "FAST", duration: [.78, .9], curve: [-1.6, 1.6], late: [-1.1, 1.1],
        depth: [-4, 4], acceleration: .1
      },
      breaking: {
        name: "BREAK", duration: [.82, .96], curve: [6, 10], late: [7, 12],
        depth: [3, 8], directional: true, acceleration: .13
      },
      powerFast: {
        name: "POWER FAST", duration: [.61, .71], curve: [-1.8, 1.8], late: [-1.5, 1.5],
        depth: [-6, 6], acceleration: .2
      },
      fastBreak: {
        name: "FAST BREAK", duration: [.66, .78], curve: [9, 14], late: [12, 19],
        depth: [5, 11], directional: true, acceleration: .24
      },
      ultraFast: {
        name: "ULTRA FAST", duration: [.46, .54], curve: [-2.2, 2.2], late: [-1.8, 1.8],
        depth: [-7, 7], acceleration: .32
      },
      ultraBreak: {
        name: "ULTRA BREAK", duration: [.5, .6], curve: [11, 17], late: [17, 26],
        depth: [7, 14], directional: true, acceleration: .38
      },
      magic: {
        name: "MAGIC", duration: [.59, .7], curve: [11, 17], late: [17, 25],
        depth: [7, 13], directional: true, acceleration: .34,
        wobble: [4.5, 7.5], wobbleCycles: [2.4, 3.2], depthWobble: [4, 8]
      },
      vanish: {
        name: "VANISH", magicEffect: "vanish", duration: [.61, .71], curve: [9, 15], late: [15, 23],
        depth: [6, 12], directional: true, acceleration: .31,
        wobble: [3.5, 6], wobbleCycles: [2.1, 2.8], depthWobble: [3, 7]
      },
      illusion: {
        name: "ILLUSION", magicEffect: "illusion", duration: [.63, .74], curve: [8, 14], late: [14, 22],
        depth: [6, 12], directional: true, acceleration: .29,
        wobble: [3, 5.5], wobbleCycles: [2, 2.7], depthWobble: [3, 7]
      },
      ultraMagic: {
        name: "ULTRA MAGIC", duration: [.42, .5], curve: [13, 20], late: [21, 31],
        depth: [8, 15], directional: true, acceleration: .46,
        wobble: [5.5, 8.5], wobbleCycles: [2.7, 3.5], depthWobble: [5, 10]
      },
      ultraVanish: {
        name: "ULTRA VANISH", magicEffect: "vanish", duration: [.43, .51], curve: [11, 18], late: [19, 29],
        depth: [7, 14], directional: true, acceleration: .43,
        wobble: [4.5, 7], wobbleCycles: [2.5, 3.2], depthWobble: [4, 9]
      },
      ultraIllusion: {
        name: "ULTRA ILLUSION", magicEffect: "illusion", duration: [.44, .52], curve: [10, 17], late: [18, 28],
        depth: [7, 14], directional: true, acceleration: .41,
        wobble: [4, 6.5], wobbleCycles: [2.4, 3.1], depthWobble: [4, 9]
      },
      hyperRandom: {
        name: "HYPER RANDOM", duration: [.27, .36], curve: [-24, 24], late: [-38, 38],
        depth: [-17, 17], directional: true, acceleration: .62,
        wobble: [6, 11], wobbleCycles: [3.1, 5.2], depthWobble: [6, 13]
      }
    };
    const stage = score < 500 ? 0
      : score < 1000 ? 1
        : score < 2000 ? 2
          : score < 3000 ? 3
            : score < 4000 ? 4
              : score < 5000 ? 5
                : score < 10000 ? 6
                  : 7;
    const pools = [
      [pitches.slowFast],
      [pitches.fast],
      [pitches.fast, pitches.breaking],
      [pitches.powerFast, pitches.fastBreak],
      [pitches.powerFast, pitches.fastBreak, pitches.magic, pitches.vanish, pitches.powerFast, pitches.illusion],
      [pitches.ultraFast, pitches.ultraBreak, pitches.ultraMagic, pitches.ultraVanish, pitches.ultraFast, pitches.ultraIllusion],
      [pitches.ultraMagic, pitches.ultraVanish, pitches.ultraIllusion],
      [pitches.hyperRandom]
    ];
    const pool = pools[stage];
    const selected = { ...pool[(pitchNumber - 1) % pool.length], stage };
    if (stage === 7) {
      const magicRoll = Math.random();
      selected.magicEffect = magicRoll < .32 ? "vanish" : magicRoll < .68 ? "illusion" : null;
    }
    return selected;
  }

  function preparePitch() {
    const field = scene();
    pitchNumber++;
    phase = "windup";
    phaseTime = 0;
    pitchClock = 0;
    lastOutcome = "";
    catcherState = "ready";
    catcherTime = 0;
    swingConsumed = false;
    resetSwing();
    const preset = pitchPreset();
    const breakDirection = preset.directional && Math.random() < .5 ? -1 : 1;
    const targetY = field.ground - rand(9, 16) * field.unit;
    const pitchBall = ball?.returned ? ball : {};
    ball = Object.assign(pitchBall, {
      x: field.pitcher.x - 15 * field.unit,
      y: field.ground - 18 * field.unit,
      z: 0,
      depth: 0,
      startX: field.pitcher.x - 15 * field.unit,
      startY: field.ground - 18 * field.unit,
      // A missed pitch continues through the hitting point into the catcher's
      // glove instead of stopping and teleporting behind the batter.
      targetX: field.catcher.x + 8 * field.unit,
      targetY,
      duration: rand(...preset.duration),
      curve: rand(...preset.curve) * field.unit * breakDirection,
      lateBreak: rand(...preset.late) * field.unit * (preset.directional ? -breakDirection : 1),
      pitchDepth: rand(...preset.depth) * field.unit,
      acceleration: preset.acceleration || 0,
      wobble: preset.wobble ? rand(...preset.wobble) * field.unit : 0,
      wobbleCycles: preset.wobbleCycles ? rand(...preset.wobbleCycles) : 0,
      depthWobble: preset.depthWobble ? rand(...preset.depthWobble) * field.unit : 0,
      pitchStage: preset.stage,
      pitchTime: 0,
      t: 0,
      baseR: 2.7 * field.unit,
      r: 2.7 * field.unit,
      spinPhase: rand(0, Math.PI * 2),
      spinRate: rand(19, 29) * (preset.duration[1] < .6 ? 1.5 : preset.duration[1] < .8 ? 1.22 : 1) * breakDirection,
      spinTilt: rand(-.62, .62),
      released: false,
      owner: "pitcher",
      returning: false,
      returned: false,
      hit: false,
      caught: false,
      grounded: false,
      bounces: 0,
      gravityScale: 1,
      undercut: 0,
      carry: 0,
      maxHeight: 0,
      predictedX: field.primaryX + field.playWidth * .68,
      trail: [],
      edgeBurst: false,
      edgeHeight: null,
      primaryEdgeCrossed: false,
      boundaryScoreAwarded: false,
      boundaryPoints: 0,
      magicEffect: preset.magicEffect || null,
      kind: preset.name
    });
  }

  function batterAnimation() {
    if (phase === "return" && lastOutcome === "STRIKE" && catcherTime < .72) {
      return { clip: "batterMiss", time: stepTime(catcherTime) };
    }
    if (swing.phase === "ready") {
      return { clip: "batterReady", time: stepTime(performance.now() / 1000) };
    }
    const duration = window.StickMotion.clips.batterSwing.duration;
    return { clip: "batterSwing", time: stepTime(clamp(swing.progress, 0, 1) * duration) };
  }

  function mouseAxes() {
    const field = scene();
    return {
      horizontal: clamp((cursor.x - neutralX) / (field.playWidth * .42), -1, 1),
      vertical: clamp((cursor.y - neutralY) / (field.playHeight * .42), -1, 1)
    };
  }

  function batPose() {
    const field = scene();
    const animation = batterAnimation();
    const rig = window.StickMotion.pose(animation.clip, animation.time);
    const characterScale = field.actorScale * 1.08;
    const axes = mouseAxes();
    const motionProgress = clamp(swing.progress, 0, 1);
    const loadTravel = smooth(motionProgress / .39);
    const driveTravel = smooth((motionProgress - .39) / .39);
    const wrap = ["follow", "recover"].includes(swing.phase)
      ? smooth((motionProgress - .78) / .22)
      : 0;
    const forwardLead = clamp(bat3d.tipVx / 1200, -1, 1) * 4;
    // The grip path is authored from the same progress that drives the hips
    // and shoulders. It loads beside the rear shoulder, moves through the
    // contact point, then wraps back toward the body. Cursor height only tilts
    // that path; it can no longer pull the hands away from the current pose.
    const gripTravelX = -15 - loadTravel * 5 + driveTravel * 47 - wrap * 33;
    const gripTravelY = 3 - loadTravel * 2 + driveTravel * 6 - wrap * 10 + axes.vertical * 7;
    const pivot = {
      // Both hands sit in front of the rear shoulder, matching the supplied
      // right-facing reference. The grip also travels with the mouse instead
      // of rotating around one fixed pin at the shoulder.
      x: field.batter.x + (rig.shoulder[0] + gripTravelX + forwardLead) * characterScale,
      y: field.ground + (rig.shoulder[1] + gripTravelY) * characterScale
    };
    const batLength = 58 * characterScale;
    const cosPitch = Math.cos(bat3d.pitch);
    const vector = {
      x: cosPitch * Math.cos(bat3d.yaw),
      y: Math.sin(bat3d.pitch),
      z: cosPitch * Math.sin(bat3d.yaw)
    };
    // True perspective collapses a bat to a single pixel when it points at the
    // camera. Preserve the depth value, but give the 2D silhouette a minimum
    // projected length so the player can still read which side the barrel is
    // passing through.
    const projectedLength = Math.hypot(vector.x, vector.y);
    if (projectedLength < .3) {
      if (projectedLength > .001) {
        const readabilityScale = .3 / projectedLength;
        vector.x *= readabilityScale;
        vector.y *= readabilityScale;
      } else {
        vector.x = bat3d.yaw <= Math.PI * .5 ? .3 : -.3;
      }
    }
    const camera = batLength * 2.3;
    const project = (distance) => {
      const x = vector.x * distance;
      const y = vector.y * distance;
      const z = vector.z * distance;
      const perspective = clamp(camera / (camera - z), .62, 1.38);
      return { x: pivot.x + x * perspective, y: pivot.y - y * perspective, z, perspective };
    };
    const handle = project(batLength * .045);
    const gripEnd = project(batLength * .14);
    const tip = project(batLength);
    const depthFactor = clamp((vector.z + 1) * .5, 0, 1);
    return {
      pivot,
      x1: handle.x, y1: handle.y,
      gripX: gripEnd.x, gripY: gripEnd.y,
      x2: tip.x, y2: tip.y,
      angle: Math.atan2(tip.y - handle.y, tip.x - handle.x),
      depth: vector.z,
      width: 1.9 * field.unit * tip.perspective * lerp(.72, 1.28, depthFactor),
      perspective: tip.perspective
    };
  }

  function updateSwingState(dt) {
    const field = scene();
    swing.time += dt;
    swing.peakSpeed = Math.max(swing.peakSpeed, bat3d.tipSpeed);
    const loadAmount = smooth((bat3d.yaw - BAT_READY_YAW - .05) / 1.42);
    const loaded = loadAmount > .58 && bat3d.tipSpeed < 190;
    if (swing.phase === "ready" && loaded) {
      swing.phase = "loading";
      swing.time = 0;
      swing.load = loadAmount;
      swing.progress = .04 + swing.load * .35;
    }
    if (swing.phase === "loading") {
      // Loading is reversible. If the cursor and bat return toward center, the
      // leg lift and stride return with them instead of remaining stuck ahead.
      swing.load = lerp(swing.load, loadAmount, 1 - Math.exp(-22 * dt));
      swing.progress = swing.load > .02 ? .04 + swing.load * .35 : 0;
      if (swing.load < .025 && bat3d.tipSpeed < 90) {
        swing.phase = "ready";
        swing.time = 0;
        swing.progress = 0;
      }
    }
    const forwardSwing = (bat3d.tipVx > HITTING.forwardTipSpeed || cursor.rawVx > field.playWidth * HITTING.cursorForwardRatio)
      && bat3d.tipSpeed > HITTING.minTipSpeed;
    const pitchInProgress = phase === "windup" || phase === "pitch";
    const canStartSwing = !pitchInProgress || !swingConsumed;
    if (forwardSwing && canStartSwing && (swing.phase === "ready" || swing.phase === "loading" || swing.phase === "recover")) {
      swing.phase = "forward";
      swing.time = 0;
      swing.peakSpeed = bat3d.tipSpeed;
      swing.contactSpeed = bat3d.tipSpeed;
      swing.contactVx = bat3d.tipVx;
      swing.contactVy = bat3d.tipVy;
      swing.load = Math.max(.42, swing.load);
      swing.startYaw = bat3d.yaw;
      swing.progress = Math.max(.39, swing.progress);
      swing.outcome = "";
      if (pitchInProgress) swingConsumed = true;
    }
    if (["forward", "follow"].includes(swing.phase) && bat3d.tipVx > 0 && bat3d.tipSpeed >= swing.contactSpeed) {
      swing.contactSpeed = bat3d.tipSpeed;
      swing.contactVx = bat3d.tipVx;
      swing.contactVy = bat3d.tipVy;
    }
    if (swing.phase === "forward") {
      const yawTravel = Math.max(0, swing.startYaw - bat3d.yaw);
      const travelRange = Math.max(.72, swing.startYaw - .12);
      const drive = smooth(clamp(yawTravel / travelRange, 0, 1));
      swing.progress = Math.max(swing.progress, .39 + drive * .39);
    }
    if (swing.phase === "forward" && (swing.progress >= .765 || (swing.time > .55 && bat3d.yaw < BAT_READY_YAW - .12))) {
      swing.phase = "follow";
      swing.time = 0;
    } else if (swing.phase === "impact" && impactFreeze <= 0) {
      swing.phase = "follow";
      swing.time = 0;
    } else if (swing.phase === "follow" && swing.time > .5) {
      swing.phase = "recover";
      swing.time = 0;
    } else if (swing.phase === "recover" && swing.time > .32) {
      swing.phase = loaded ? "loading" : "ready";
      swing.time = 0;
      swing.peakSpeed = 0;
    }
    if (swing.phase === "impact") swing.progress = Math.max(swing.progress, .72);
    if (swing.phase === "follow") {
      // Follow-through advances only as far as the physical barrel has wrapped.
      // Time alone must never put the body in a finish pose while the bat is
      // still beside or behind the catcher.
      const yawWrap = smooth(clamp((.18 - bat3d.yaw) / 1.58, 0, 1));
      const momentumWrap = smooth(clamp(bat3d.followThrough / 1.06, 0, 1));
      const wrapAmount = Math.max(yawWrap, momentumWrap * .82);
      swing.progress = Math.max(swing.progress, .76 + wrapAmount * .24);
    }
    if (swing.phase === "recover") swing.progress = 1;
  }

  function updateBatControl(dt) {
    const field = scene();
    const speedFactor = clamp(cursor.rawSpeed / 1700, 0, 1);
    const follow = 1 - Math.exp(-lerp(20, 48, speedFactor) * dt);
    const previousX = cursor.x;
    const previousY = cursor.y;
    cursor.x = lerp(cursor.x, cursor.targetX, follow);
    cursor.y = lerp(cursor.y, cursor.targetY, follow);
    cursor.vx = (cursor.x - previousX) / Math.max(dt, .001);
    cursor.vy = (cursor.y - previousY) / Math.max(dt, .001);
    cursor.speed = Math.hypot(cursor.vx, cursor.vy);

    const { horizontal, vertical } = mouseAxes();
    // Screen center is always the supplied ready pose: barrel behind and up.
    // Moving right/down sweeps it through a level contact position.
    bat3d.targetYaw = clamp(BAT_READY_YAW - horizontal * 1.66, -.2, 2.82);
    bat3d.targetPitch = clamp(BAT_READY_PITCH - vertical * .98, -.56, 1.02);

    const targetYawVelocity = clamp(-cursor.rawVx / (field.playWidth * .42) * 1.76, -22, 22);
    const targetPitchVelocity = clamp(-cursor.rawVy / (field.playHeight * .42) * .92, -18, 18);
    const forwardImpulse = clamp(-targetYawVelocity / 15, 0, 1) * speedFactor;
    bat3d.followThrough = Math.max(bat3d.followThrough, forwardImpulse * 1.08);
    const carrying = targetYawVelocity < -1.5 || ["forward", "impact", "follow"].includes(swing.phase);
    bat3d.followThrough *= Math.exp(-(carrying ? 1.65 : 8.5) * dt);
    // A quick mouse sweep carries the barrel beyond the cursor target around
    // the body. Slow cursor placement has almost no carry and stays precise.
    const wrapMultiplier = swing.phase === "follow" ? 2.08 : swing.phase === "impact" ? 1.35 : 1;
    const drivenYaw = bat3d.targetYaw - bat3d.followThrough * (carrying ? wrapMultiplier : .18);
    const frequency = lerp(14, 32, speedFactor);
    const stiffness = frequency * frequency;
    const damping = frequency * 2;
    bat3d.yawVelocity += (stiffness * (drivenYaw - bat3d.yaw) + damping * (targetYawVelocity - bat3d.yawVelocity)) * dt;
    bat3d.pitchVelocity += (stiffness * (bat3d.targetPitch - bat3d.pitch) + damping * (targetPitchVelocity - bat3d.pitchVelocity)) * dt;
    bat3d.yawVelocity = clamp(bat3d.yawVelocity, -32, 32);
    bat3d.pitchVelocity = clamp(bat3d.pitchVelocity, -24, 24);
    bat3d.yaw += bat3d.yawVelocity * dt;
    bat3d.pitch += bat3d.pitchVelocity * dt;

    // Sample the barrel first to derive velocity. Swing state can advance the
    // body/grip pose, so the collision pose is sampled again after that state
    // update and shared with rendering below.
    const motionPose = batPose();
    if (bat3d.previousTip) {
      let vx = (motionPose.x2 - bat3d.previousTip.x) / Math.max(dt, .001);
      let vy = (motionPose.y2 - bat3d.previousTip.y) / Math.max(dt, .001);
      const rawSpeed = Math.hypot(vx, vy);
      if (rawSpeed > 2500) {
        const scale = 2500 / rawSpeed;
        vx *= scale;
        vy *= scale;
      }
      const velocityBlend = 1 - Math.exp(-18 * dt);
      bat3d.tipVx = lerp(bat3d.tipVx, vx, velocityBlend);
      bat3d.tipVy = lerp(bat3d.tipVy, vy, velocityBlend);
      bat3d.tipSpeed = Math.hypot(bat3d.tipVx, bat3d.tipVy);
    }
    bat3d.previousTip = { x: motionPose.x2, y: motionPose.y2 };
    updateSwingState(dt);
    const pose = batPose();
    previousPhysicsBat = physicsBat || pose;
    physicsBat = pose;
    batContactTrail.forEach((frame) => { frame.age += dt; });
    batContactTrail = batContactTrail.filter((frame) => frame.age <= HITTING.timingMemory);
    if (["forward", "follow"].includes(swing.phase) && bat3d.tipVx > 0 && bat3d.tipSpeed >= HITTING.minTipSpeed) {
      batContactTrail.push({
        bat: pose,
        speed: bat3d.tipSpeed,
        vx: bat3d.tipVx,
        vy: bat3d.tipVy,
        rawVx: cursor.rawVx,
        rawVy: cursor.rawVy,
        rawSpeed: cursor.rawSpeed,
        age: 0
      });
      if (batContactTrail.length > 18) batContactTrail.shift();
    }
  }

  function closestOnSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const size = dx * dx + dy * dy;
    const t = size ? clamp(((px - x1) * dx + (py - y1) * dy) / size, 0, 1) : 0;
    const x = x1 + t * dx;
    const y = y1 + t * dy;
    return { t, x, y, offsetX: x - px, offsetY: y - py, distance: Math.hypot(px - x, py - y) };
  }

  function sweptBatContact(px, py, previous, current, radius) {
    const movement = Math.max(
      Math.hypot(current.x1 - previous.x1, current.y1 - previous.y1),
      Math.hypot(current.x2 - previous.x2, current.y2 - previous.y2)
    );
    const steps = clamp(Math.ceil(movement / Math.max(2, radius * .55)), 1, 24);
    let best = { t: 0, distance: Infinity };
    for (let index = 0; index <= steps; index++) {
      const mix = index / steps;
      const sample = closestOnSegment(
        px, py,
        lerp(previous.x1, current.x1, mix), lerp(previous.y1, current.y1, mix),
        lerp(previous.x2, current.x2, mix), lerp(previous.y2, current.y2, mix)
      );
      if (sample.distance < best.distance) {
        best = {
          ...sample,
          sweep: mix,
          bat: {
            pivot: {
              x: lerp(previous.pivot.x, current.pivot.x, mix),
              y: lerp(previous.pivot.y, current.pivot.y, mix)
            },
            x1: lerp(previous.x1, current.x1, mix),
            y1: lerp(previous.y1, current.y1, mix),
            gripX: lerp(previous.gripX, current.gripX, mix),
            gripY: lerp(previous.gripY, current.gripY, mix),
            x2: lerp(previous.x2, current.x2, mix),
            y2: lerp(previous.y2, current.y2, mix),
            angle: lerp(previous.angle, current.angle, mix),
            depth: lerp(previous.depth, current.depth, mix),
            width: lerp(previous.width, current.width, mix),
            perspective: lerp(previous.perspective, current.perspective, mix)
          }
        };
      }
    }
    return best;
  }

  function assistedBatContact(px, py, current, radius) {
    let best = {
      ...sweptBatContact(px, py, previousPhysicsBat || current, current, radius),
      speed: bat3d.tipSpeed,
      vx: bat3d.tipVx,
      vy: bat3d.tipVy,
      rawVx: cursor.rawVx,
      rawVy: cursor.rawVy,
      rawSpeed: cursor.rawSpeed,
      age: 0
    };
    for (let index = 0; index < batContactTrail.length; index++) {
      const frame = batContactTrail[index];
      const previous = index ? batContactTrail[index - 1].bat : frame.bat;
      const candidate = sweptBatContact(px, py, previous, frame.bat, radius);
      if (candidate.distance < best.distance) {
        best = {
          ...candidate,
          speed: Math.max(frame.speed, swing.contactSpeed * .88),
          vx: frame.vx || swing.contactVx,
          vy: frame.vy || swing.contactVy,
          rawVx: frame.rawVx,
          rawVy: frame.rawVy,
          rawSpeed: frame.rawSpeed,
          age: frame.age
        };
      }
    }
    return best;
  }

  function predictedLandingX() {
    if (!ball || ball.grounded) return ball?.x || 0;
    const gravity = scene().playHeight * 1.08 * (ball.gravityScale || 1);
    const floor = ball.r;
    const time = (ball.vz + Math.sqrt(Math.max(0, ball.vz * ball.vz + 2 * gravity * Math.max(0, ball.z - floor)))) / gravity;
    return ball.x + ball.vx * time;
  }

  function assignDefense() {
    const field = scene();
    const landing = predictedLandingX();
    ball.predictedX = landing;
    const primary = landing < field.primaryX + field.playWidth * .68 ? 0 : 1;
    defenders.forEach((defender, index) => {
      defender.assigned = index === primary;
      defender.state = "ready";
      defender.stateTime = 0;
      defender.attempted = false;
      defender.vx = 0;
    });
  }

  function addFeedback(text, x, y, color = colors.cream, size = 12, life = .85) {
    feedbacks.push({ text, x, y, color, size, life, maxLife: life });
  }

  function hitStrengthIndex(quality, power, center, sweet) {
    const energy = clamp(quality * .44 + power * .56, 0, 1);
    if (center >= .82 && sweet >= .8 && power >= .86) return 5;
    if ((center >= .69 && sweet >= .66 && power >= .7) || energy >= .82) return 4;
    return HIT_STRENGTHS.findIndex((profile) => energy <= profile.max);
  }

  function trajectoryIndex(launchDegrees) {
    const index = BATTED_TRAJECTORIES.findIndex((profile) => launchDegrees < profile.max);
    return index < 0 ? BATTED_TRAJECTORIES.length - 1 : index;
  }

  function addImpact(x, y, options) {
    const {
      strengthIndex = 2,
      trajectoryIndex: trajectory = 3,
      directionAngle = 0,
      depth = 0,
      power = .6,
      lifeScale = 1
    } = options || {};
    const strength = HIT_STRENGTHS[clamp(strengthIndex, 0, HIT_STRENGTHS.length - 1)];
    const flight = BATTED_TRAJECTORIES[clamp(trajectory, 0, BATTED_TRAJECTORIES.length - 1)];
    const depthScale = clamp(1 + depth * .13, .86, 1.14);
    const depthAlpha = clamp(1 + depth * .16, .78, 1.12);
    const behindShare = clamp(.48 - depth * .34, .16, .82);
    const layerFor = () => Math.random() < behindShare ? "back" : "front";
    const forwardCount = Math.ceil(strength.lines * .76);

    for (let index = 0; index < strength.lines; index++) {
      const forward = index < forwardCount;
      const baseAngle = directionAngle + (forward ? 0 : Math.PI);
      const spread = flight.spread * (forward ? 1 : 1.45);
      const angle = baseAngle + rand(-spread, spread);
      const length = rand(8, 17 + strengthIndex * 8.5) * strength.scale * depthScale * (forward ? 1 : .54);
      const life = (.125 + strengthIndex * .022) * lifeScale;
      impactLines.push({
        x, y, angle, length,
        start: rand(1.3, 4.2),
        delay: rand(0, .018 + strengthIndex * .006),
        color: index % 5 === 0 ? flight.accent : strength.color,
        width: rand(.72, 1.1 + strengthIndex * .34) * depthScale,
        curve: flight.curve * length * (index % 2 ? 1 : -.72),
        alphaScale: depthAlpha,
        layer: layerFor(),
        life,
        maxLife: life
      });
    }

    for (let index = 0; index < strength.rings; index++) {
      const life = (.16 + strengthIndex * .022 + index * .025) * lifeScale;
      const scale = strength.scale * depthScale * (1 + index * .34);
      impactRings.push({
        x, y,
        angle: directionAngle,
        squash: clamp(flight.ringSquash * lerp(1, .7, Math.abs(depth)), .16, .72),
        radius: 2 + index,
        startRadius: 2 + index,
        maxRadius: (13 + strengthIndex * 6 + power * 7) * scale,
        life,
        maxLife: life,
        color: index === 0 ? strength.color : flight.accent,
        width: (1 + strengthIndex * .24) / (1 + index * .14),
        glow: index === 0 ? strength.glow : strength.glow * .32,
        alphaScale: depthAlpha,
        layer: index === 0 ? layerFor() : "front"
      });
    }

    if (trajectory === 7 && strengthIndex >= 3) {
      const life = (.3 + strengthIndex * .018) * lifeScale;
      impactRings.push({
        x, y, angle: directionAngle, squash: .2,
        radius: 3, startRadius: 3,
        maxRadius: (34 + strengthIndex * 8) * depthScale,
        life, maxLife: life, color: "#ffffff", width: 1.1,
        glow: strength.glow * .42, alphaScale: depthAlpha, layer: "front"
      });
    }

    for (let index = 0; index < strength.particles; index++) {
      const forward = index < Math.ceil(strength.particles * .78);
      const angle = directionAngle + (forward ? rand(-flight.spread * 1.25, flight.spread * 1.25) : Math.PI + rand(-.72, .72));
      const speed = rand(52, 175) * strength.scale * depthScale * (forward ? 1 : .42);
      const life = rand(.17, .3 + strengthIndex * .04) * lifeScale;
      const dust = trajectory <= 1 && index % 3 === 0;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: index % 4 === 0 ? flight.accent : strength.color,
        life,
        maxLife: life,
        size: rand(.75, 1.35 + strengthIndex * .29) * depthScale,
        shape: dust ? "dust" : "spark",
        rotation: angle,
        spin: rand(-5, 5),
        gravity: flight.gravity,
        drag: dust ? .055 : .13,
        alphaScale: depthAlpha,
        layer: layerFor()
      });
    }
    return { strength, flight, strengthIndex, trajectoryIndex: trajectory };
  }

  function previewHitEffects() {
    if (phase === "gameover") return;
    effectPreviewTimers.forEach(clearTimeout);
    effectPreviewTimers = [];
    particles = [];
    impactLines = [];
    impactRings = [];
    edgeBlasts = [];
    const pageMs = 1550;
    effectPreviewUntil = performance.now() + HIT_STRENGTHS.length * pageMs + 500;
    HIT_STRENGTHS.forEach((strength, strengthIndex) => {
      const timer = setTimeout(() => {
        const field = scene();
        particles = [];
        feedbacks = [];
        impactLines = [];
        impactRings = [];
        BATTED_TRAJECTORIES.forEach((flight, trajectory) => {
          const column = trajectory % 4;
          const row = Math.floor(trajectory / 4);
          const x = field.primaryX + field.playWidth * (.17 + column * .22);
          const y = field.primaryY + field.playHeight * (.3 + row * .34);
          const previousMax = trajectory ? BATTED_TRAJECTORIES[trajectory - 1].max : -8;
          const launchDegrees = (previousMax + flight.max) * .5;
          addImpact(x, y, {
            strengthIndex,
            trajectoryIndex: trajectory,
            directionAngle: -launchDegrees * Math.PI / 180,
            depth: column % 2 ? .42 : -.42,
            power: lerp(.35, 1, strengthIndex / 5),
            lifeScale: 3.4
          });
          addFeedback(`${strength.label} · ${flight.label}`, x, y + 35, strength.color, 11.5, 1.28);
        });
        shake = strength.shake * .18;
      }, strengthIndex * pageMs);
      effectPreviewTimers.push(timer);
    });
  }

  function previewHomeRunEffects() {
    if (phase === "gameover") return;
    effectPreviewTimers.forEach(clearTimeout);
    effectPreviewTimers = [];
    particles = [];
    feedbacks = [];
    impactLines = [];
    impactRings = [];
    edgeBlasts = [];
    const pageMs = 1320;
    effectPreviewUntil = performance.now() + HOME_RUN_REWARDS.length * pageMs + 450;
    HOME_RUN_REWARDS.forEach((reward, index) => {
      const timer = setTimeout(() => {
        const field = scene();
        particles = [];
        feedbacks = [];
        edgeBlasts = [];
        const nextMin = HOME_RUN_REWARDS[index + 1]?.min ?? .78;
        const previewHeight = (reward.min + nextMin) * .5;
        const y = clamp(field.ground - field.playHeight * previewHeight, field.primaryY + 16, field.ground - 12);
        playBoundaryExitEffect(y, reward, field.primaryRight - 1);
      }, index * pageMs);
      effectPreviewTimers.push(timer);
    });
  }

  function burst(x, y, color, count, force = 1) {
    for (let index = 0; index < count; index++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(45, 190) * force;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life: rand(.28, .72), size: rand(1.5, 4.5) });
    }
  }

  function addHomeRunCelebrationParticles(field, y, reward) {
    // These particles support the boundary motif; they must not become a
    // second full-screen explosion competing with it.
    const counts = [2, 4, 6, 8, 10, 13, 17];
    const coverageStart = [.84, .8, .76, .71, .65, .59, .53][reward.tier];
    const verticalSpread = [.04, .055, .07, .09, .115, .15, .2][reward.tier];
    const count = counts[reward.tier];
    for (let index = 0; index < count; index++) {
      const x = field.primaryX + field.playWidth * rand(coverageStart, .97);
      const spreadY = field.playHeight * verticalSpread;
      const py = clamp(y + rand(-spreadY, spreadY), field.primaryY + 20, field.ground - 16);
      const alternate = index % 4 === 0;
      const common = {
        x, y: py,
        color: alternate ? "#ffffff" : reward.color,
        life: .34 + reward.tier * .04 + rand(.05, .14),
        size: rand(.9, 1.6 + reward.tier * .14),
        layer: "front",
        alphaScale: .7 + reward.tier * .035,
        age: 0,
        phase: rand(0, Math.PI * 2)
      };

      if (reward.style === "chip") {
        Object.assign(common, {
          shape: "chip", vx: rand(-115, -45), vy: rand(-75, 34),
          gravity: 170, drag: .16, dragY: .32,
          rotation: rand(0, Math.PI * 2), spin: rand(-9, 9)
        });
      } else if (reward.style === "dust") {
        Object.assign(common, {
          shape: "dust", vx: rand(-82, -24), vy: rand(-24, 8),
          gravity: -7, drag: .035, dragY: .08,
          size: common.size * 1.18, rotation: rand(-.22, .22), spin: rand(-.4, .4),
          alphaScale: .48
        });
      } else if (reward.style === "slice") {
        Object.assign(common, {
          shape: "slash", vx: rand(-235, -105), vy: rand(-125, -42),
          gravity: 52, drag: .22, dragY: .34,
          rotation: rand(-.58, -.34), spin: rand(-1.2, 1.2),
          size: common.size * 1.04
        });
      } else if (reward.style === "pulse") {
        const angle = rand(Math.PI * .78, Math.PI * 1.22);
        const speed = rand(35, 105);
        Object.assign(common, {
          shape: "orb", vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          gravity: 0, drag: .38, dragY: .38,
          pulseRate: rand(8, 13), size: common.size * 1.18,
          color: alternate ? "#ffffff" : colors.yellow
        });
      } else if (reward.style === "spiral") {
        Object.assign(common, {
          shape: "comet", vx: rand(-175, -72), vy: rand(-105, 48),
          gravity: 8, drag: .48, dragY: .52,
          wobble: rand(18, 42), wobbleRate: rand(5.5, 8.5),
          size: common.size
        });
      } else if (reward.style === "prism") {
        Object.assign(common, {
          shape: "diamond", vx: rand(-145, -44), vy: rand(-92, 66),
          gravity: 26, drag: .31, dragY: .4,
          rotation: rand(0, Math.PI * 2), spin: rand(-7, 7),
          size: common.size * 1.16,
          color: index % 3 === 0 ? colors.blue : index % 3 === 1 ? reward.color : "#ffffff"
        });
      } else {
        const angle = rand(Math.PI * .68, Math.PI * 1.32);
        const speed = rand(65, 210);
        Object.assign(common, {
          shape: "star", vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          gravity: 18, drag: .42, dragY: .46,
          rotation: rand(0, Math.PI * 2), spin: rand(-4, 4),
          pulseRate: rand(11, 18), size: common.size * 1.22,
          color: index % 3 === 0 ? colors.yellow : "#ffffff"
        });
      }
      common.maxLife = common.life;
      particles.push(common);
    }
  }

  function addRightEdgeBlast(y, force = 1, reward = HOME_RUN_REWARDS[0], edgeX = width - 1) {
    const { tier, style, color, rgb } = reward;
    const maxLife = .68 + tier * .065;
    const shardCount = Math.round(6 + force * 6 + tier * 2.2);
    const shards = Array.from({ length: shardCount }, (_, index) => ({
      angle: Math.PI + rand(-1.02, 1.02),
      speed: rand(70, 225) * lerp(.8, 1.18, force),
      size: rand(2.2, 6.4 + tier * 1.2) * lerp(.82, 1.12, force),
      rotation: rand(0, Math.PI * 2),
      spin: rand(-12, 12),
      delay: rand(0, .1),
      color: index % 5 === 0 ? colors.yellow : index % 2 ? "#ffffff" : color
    }));
    const rayCount = 4 + tier * 2;
    const rays = Array.from({ length: rayCount }, (_, index) => ({
      angle: Math.PI + lerp(-.92, .92, index / Math.max(1, rayCount - 1)) + rand(-.08, .08),
      length: rand(24, 56 + tier * 10) * lerp(.82, 1.2, force),
      width: rand(.8, 2.2)
    }));
    const tear = [];
    const tearSpan = 25 + force * 18;
    for (let index = 0; index <= 9; index++) {
      tear.push({
        x: index === 0 || index === 9 ? 0 : -rand(1, 8) * (index % 2 ? 1 : .45),
        y: lerp(-tearSpan, tearSpan, index / 9)
      });
    }
    edgeBlasts.push({
      x: edgeX,
      y,
      force,
      tier,
      style,
      color,
      rgb,
      life: maxLife,
      maxLife,
      radius: 28 + force * 24 + tier * 8,
      shards,
      rays,
      tear
    });
    shake = Math.max(shake, 2.2 + force * 3.4 + tier * 1.35);
  }

  function playBoundaryExitEffect(y, reward, edgeX = scene().primaryRight - 1) {
    const field = scene();
    // Score tier, not a hidden velocity multiplier, owns the presentation.
    // Preview and real play therefore generate the exact same effect stack.
    const force = .74 + reward.tier * .1;
    addRightEdgeBlast(y, force, reward, edgeX);
    const feedbackX = clamp(field.primaryRight - Math.max(130, field.playWidth * .1), field.primaryX + 100, field.primaryRight - 100);
    const feedbackY = clamp(y - 18, field.primaryY + 58, field.ground - 62);
    addFeedback(reward.title, feedbackX, feedbackY, reward.color, 16 + reward.tier * 1.3, 2.05);
    addFeedback(`+${reward.points}`, feedbackX, feedbackY + 25, reward.color, 13 + reward.tier * .8, 2.05);
    addHomeRunCelebrationParticles(field, y, reward);
  }

  function checkSwing() {
    const activeSwing = swing.phase === "forward"
      || (swing.phase === "follow" && swing.time < .34)
      || batContactTrail.length > 0;
    if (phase !== "pitch" || !ball?.released || ball.hit
      || ball.t < HITTING.earliestPitchT || ball.t > HITTING.latestPitchT || !activeSwing) return;
    // Collision and drawing now consume the exact same simulation sample.
    const bat = physicsBat || batPose();
    const field = scene();
    const batTier = activeBatTier();
    const contactRadius = ball.r + (HITTING.contactPadding + batTier.accuracy * 12) * field.unit;
    const contact = assistedBatContact(ball.x, ball.y, bat, contactRadius);
    if (contact.distance > contactRadius || contact.speed < HITTING.minTipSpeed) return;

    const center = clamp(1 - contact.distance / (ball.r + 19.5 * field.unit) + batTier.accuracy, 0, 1);
    const sweet = clamp(1 - Math.abs(contact.t - .76) / .4 + batTier.accuracy, 0, 1);
    const direction = clamp(contact.vx / Math.max(1, contact.speed), 0, 1);
    const timing = lerp(1, .9, clamp(contact.age / HITTING.timingMemory, 0, 1));
    const quality = clamp((center * .4 + sweet * .34 + direction * .16) * timing + .12, .2, 1);
    // A visible bat/ball touch should produce a satisfying result. Accuracy
    // still separates a bloop from a perfect drive, but low-speed contact no
    // longer dies directly in front of the batter.
    const power = clamp((contact.speed / 620) * (.74 + quality * .72) * (1 + batTier.power), .38, 1);
    const projectedUpward = clamp(-contact.vy / Math.max(1, contact.speed), -1, 1);
    const rawUpward = (contact.rawSpeed || 0) > 45
      ? clamp(-contact.rawVy / contact.rawSpeed, -1, 1)
      : projectedUpward;
    // Blend the literal mouse gesture back into the projected 3D bat speed so
    // foreshortening cannot erase a deliberate lower-left to upper-right cut.
    const upward = lerp(projectedUpward, rawUpward, .46);
    // Positive offset means the bat passed below the ball's center. Unlike the
    // old unsigned distance, this lets an actual undercut create real loft.
    const undercut = clamp((contact.y - ball.y) / Math.max(ball.r + 9 * field.unit, 1), -1, 1);
    const launchDegrees = clamp(
      18 + upward * 29 + undercut * 25 + (sweet - .5) * 9 + (center - .5) * 6,
      -8,
      65
    );
    const launchAngle = launchDegrees * Math.PI / 180;
    const accuracy = center * .56 + sweet * .44;
    const perfectContact = center >= .82 && sweet >= .8 && power >= .86;
    const strengthIndex = hitStrengthIndex(quality, power, center, sweet);
    const trajectory = trajectoryIndex(launchDegrees);
    const strengthVelocity = [.88, .94, 1, 1.05, 1.1, 1.15][strengthIndex];
    const exitSpeed = field.playWidth * (.34 + power * .68) * strengthVelocity;
    const carry = clamp((power - .42) / .58, 0, 1) * clamp((launchDegrees - 20) / 34, 0, 1);
    const verticalBoost = 1 + carry * .19;
    const backspin = clamp(undercut * .66 + upward * .42, -1, 1);

    const impactX = ball.x;
    const impactY = ball.y;
    ball.hit = true;
    ball.contactX = impactX;
    ball.contactY = impactY;
    // During hit-stop, freeze the barrel at the swept point that actually
    // touched the ball instead of at the end of the simulation frame.
    impactDisplayBat = contact.bat || bat;
    // Batted-ball Y is the ground baseline; Z alone represents height. The old
    // code subtracted the radius here and then subtracted Z again while drawing,
    // leaving some landed balls visibly floating above the desktop ground.
    ball.y = field.ground;
    ball.z = Math.max(ball.baseR, field.ground - impactY);
    ball.depth = 0;
    ball.vx = exitSpeed * Math.cos(launchAngle);
    ball.vz = exitSpeed * Math.sin(launchAngle) * verticalBoost;
    ball.gravityScale = clamp(lerp(1.04, .86, (backspin + 1) * .5) - carry * .07, .78, 1.08);
    ball.undercut = undercut;
    ball.backspin = backspin;
    ball.carry = carry;
    ball.depthV = bat.depth * field.playHeight * .075;
    ball.spinRate = (18 + Math.abs(backspin) * 27 + power * 18) * (backspin >= 0 ? -1 : 1);
    ball.spinTilt = clamp(launchAngle * .55 + bat.depth * .42, -.85, .85);
    ball.bounce = lerp(.24, .48, quality);
    ball.grounded = false;
    ball.bounces = 0;
    ball.maxHeight = ball.z;
    ball.strengthIndex = strengthIndex;
    ball.strengthType = HIT_STRENGTHS[strengthIndex].key;
    ball.trajectoryIndex = trajectory;
    ball.trajectoryType = BATTED_TRAJECTORIES[trajectory].key;
    ball.contactType = trajectory <= 1 ? "GROUNDER" : trajectory <= 4 ? "LINER" : "FLY";
    ball.homerCandidate = power > .62 && launchAngle > .28;
    ball.trail = [];
    phase = "flight";
    phaseTime = 0;
    swing.phase = "impact";
    swing.time = 0;
    swing.progress = Math.max(swing.progress, .72);
    swing.outcome = quality > .78 ? "SWEET" : "CONTACT";
    const effectAngle = -launchAngle;
    const impact = addImpact(impactX, impactY, {
      strengthIndex,
      trajectoryIndex: trajectory,
      directionAngle: effectAngle,
      depth: bat.depth,
      power
    });
    const heavyContact = strengthIndex >= 4;
    const freezeFrames = impact.strength.freeze;
    impactFreeze = freezeFrames / ANIMATION_FPS;
    impactFreezeMax = impactFreeze;
    impactPunch = heavyContact ? {
      x: impactX,
      y: impactY,
      strength: clamp((accuracy * .52 + power * .48 - .68) / .32, .35, 1),
      perfect: perfectContact,
      life: perfectContact ? .62 : .48,
      maxLife: perfectContact ? .62 : .48,
      released: false,
      releaseLife: 0
    } : null;
    shake = impact.strength.shake * lerp(.74, 1.12, power);
    assignDefense();
  }

  function recordBallTrail(x, y, z, r, mode) {
    if (!ball) return;
    const now = performance.now();
    const screenY = y - (z || 0);
    const previous = ball.trail[ball.trail.length - 1];
    const previousY = previous ? previous.y - (previous.z || 0) : screenY;
    const distance = previous ? Math.hypot(x - previous.x, screenY - previousY) : Infinity;
    const elapsed = previous ? Math.max(1, now - previous.at) : 1000 / 60;
    const minSpacing = Math.max(2.2 * scene().unit, r * .72);

    // Keep samples spatially even. This prevents slow balls from becoming a
    // string of overlapping dots while still preserving a fast curved path.
    if (previous && distance < minSpacing && elapsed < 42) return;

    const speed = distance === Infinity ? 0 : distance / elapsed * 1000;
    const speedFactor = clamp((speed - 70) / 760, 0, 1);
    const baseLife = mode === "hit" ? .24 : mode === "pitch" ? .19 : mode === "return" ? .15 : .09;
    const life = baseLife * lerp(.72, 1.12, speedFactor);
    ball.trail.push({ x, y, z, r, at: now, life, speed, mode });
    ball.trail = ball.trail.filter((point) => (now - point.at) / 1000 < point.life);
    if (ball.trail.length > 16) ball.trail.splice(0, ball.trail.length - 16);
  }

  function updatePitchBall(dt) {
    const field = scene();
    if (!ball.released) {
      // The ball leaves on the reference release pose (throw clip frame 9),
      // not when the arm merely starts moving forward.
      if (pitchClock < 1.74) return;
      const release = pitcherHeldBall();
      if (release) {
        ball.startX = ball.x = release.x;
        ball.startY = ball.y = release.y;
      }
      ball.released = true;
      ball.pitchTime = 0;
    }
    ball.pitchTime += dt;
    ball.spinPhase += ball.spinRate * dt;
    ball.t = ball.pitchTime / ball.duration;
    const t = ball.t;
    const clamped = clamp(t, 0, 1);
    const spacing = lerp(clamped, clamped * clamped, ball.acceleration || 0);
    ball.x = lerp(ball.startX, ball.targetX, spacing);
    const lateShape = Math.pow(clamped, 3) * (1 - clamped) * 4;
    const wobbleEnvelope = Math.sin(clamped * Math.PI);
    const wobblePhase = clamped * Math.PI * (ball.wobbleCycles || 0);
    ball.y = lerp(ball.startY, ball.targetY, spacing)
      + Math.sin(clamped * Math.PI) * ball.curve
      + lateShape * ball.lateBreak
      + Math.sin(wobblePhase) * (ball.wobble || 0) * wobbleEnvelope;
    ball.depth = ball.pitchDepth * clamped
      + Math.cos(wobblePhase * .86) * (ball.depthWobble || 0) * wobbleEnvelope;
    ball.r = ball.baseR;
    ball.y = Math.min(ball.y, field.ground - ball.r - field.unit);
    recordBallTrail(ball.x, ball.y, 0, ball.r, "pitch");
    checkSwing();
    if (t > 1.12 && phase === "pitch") missPitch();
  }

  function updateDefenders(dt) {
    if (!ball) return;
    ball.predictedX = predictedLandingX();
    const field = scene();
    defenders.forEach((defender) => {
      defender.stateTime += dt;
      if (phaseTime < defender.reaction + (defender.assigned ? 0 : .24)) return;
      const territory = defender.kind === "infield" ? [width * .39, width * .69] : [width * .66, width * .95];
      let target = clamp(ball.predictedX, territory[0], territory[1]);
      if (!defender.assigned) target = clamp(ball.predictedX, defender.kind === "infield" ? width * .58 : width * .73, defender.kind === "infield" ? width * .7 : width * .9);
      const delta = target - defender.x;
      const direction = Math.sign(delta);
      const acceleration = width * (defender.assigned ? .22 : .13);
      defender.vx += direction * acceleration * dt;
      const maxSpeed = defender.maxSpeed * (defender.assigned ? 1 : .62);
      defender.vx = clamp(defender.vx, -maxSpeed, maxSpeed);
      if (Math.abs(delta) < 4 * field.unit) defender.vx *= Math.pow(.025, dt);
      defender.x += defender.vx * dt;
      defender.runPhase += Math.abs(defender.vx) * dt / Math.max(12, field.actorScale * 54) * .5;
      if (Math.abs(defender.vx) > 3 && !["catch", "ground", "miss"].includes(defender.state)) defender.state = "run";
    });
  }

  function checkFielderPlay() {
    const field = scene();
    const screenY = ball.y - ball.z + ball.depth * .1;
    for (let index = 0; index < defenders.length; index++) {
      const defender = defenders[index];
      const gloveX = defender.x - 2 * field.unit;
      const airGloveY = field.ground - 14 * field.unit;
      const groundGloveY = field.ground - 4 * field.unit;
      const dx = Math.abs(ball.x - gloveX);
      const airCatch = !ball.grounded && dx < 11 * field.unit && Math.abs(screenY - airGloveY) < 12 * field.unit;
      const groundCatch = ball.grounded && dx < 10 * field.unit && Math.abs(screenY - groundGloveY) < 8 * field.unit && Math.abs(ball.vx) < width * .62;
      if (airCatch || groundCatch) {
        ball.caught = true;
        ball.caughtBy = index;
        ball.x = gloveX;
        ball.z = airCatch ? field.ground - airGloveY : field.ground - groundGloveY;
        ball.vx = 0;
        ball.vz = 0;
        defender.state = groundCatch ? "ground" : "catch";
        defender.stateTime = 0;
        addFeedback("OUT", defender.x, field.ground - 34 * field.unit, colors.red, 12, 1.1);
        endGame("CAUGHT");
        return true;
      }
      const passed = ball.vx > 0 && ball.x > defender.x + 8 * field.unit;
      if (!defender.attempted && passed && dx < 28 * field.unit) {
        defender.attempted = true;
        defender.state = "miss";
        defender.stateTime = 0;
      }
    }
    return false;
  }

  function edgeReward(edgeHeight) {
    for (let index = HOME_RUN_REWARDS.length - 1; index >= 0; index--) {
      if (edgeHeight >= HOME_RUN_REWARDS[index].min) return HOME_RUN_REWARDS[index];
    }
    return HOME_RUN_REWARDS[0];
  }

  function scoreForBall() {
    const field = scene();
    // A ball that clears the right boundary is scored by the exact height at
    // which it left the monitor. Higher exits always earn more; the previous
    // max-height table accidentally dropped the very highest tier back down.
    if (Number.isFinite(ball.edgeHeight)) {
      return edgeReward(ball.edgeHeight).points;
    }
    if (ball.contactType === "GROUNDER" || ball.grounded) return 100;
    const normalizedHeight = ball.maxHeight / field.playHeight;
    const normalizedX = (Math.max(ball.x, ball.predictedX) - field.primaryX) / field.playWidth;
    if (normalizedHeight > .43) return 1000;
    if (normalizedHeight > .27) return 500;
    if (normalizedHeight > .15) return 500;
    if (normalizedX > .72) return 200;
    return 100;
  }

  function resolveHit(label = "HIT") {
    if (phase !== "flight") return;
    const alreadyAwarded = Boolean(ball.boundaryScoreAwarded);
    const points = alreadyAwarded ? ball.boundaryPoints : scoreForBall();
    if (!alreadyAwarded) score += points;
    phase = "result";
    phaseTime = 0;
    lastOutcome = label;
    const field = scene();
    const homeRun = label === "HOME RUN";
    const boundaryHit = Number.isFinite(ball.edgeHeight);
    const reward = boundaryHit ? edgeReward(ball.edgeHeight) : null;
    const featuredResult = homeRun || boundaryHit;
    const feedbackX = featuredResult
      ? clamp(field.primaryRight - Math.max(130, field.playWidth * .1), field.primaryX + 100, field.primaryRight - 100)
      : clamp(ball.x, field.primaryX + 45, field.primaryRight - 45);
    const feedbackY = clamp(field.ground - Math.max(26, ball.z) - 16, field.primaryY + 58, field.ground - 62);
    if (featuredResult && !alreadyAwarded) {
      addFeedback(reward.title, feedbackX, feedbackY, reward.color, 16 + reward.tier * 1.3, 2.05);
      addFeedback(`+${points}`, feedbackX, feedbackY + 25, reward.color, 13 + reward.tier * .8, 2.05);
    } else if (!alreadyAwarded) {
      addFeedback(`+${points}`, feedbackX, feedbackY, colors.green, 13, 1.1);
    }
    if (label === "HOME RUN" && !alreadyAwarded) {
      shake = 6 + reward.tier * 1.25;
      for (let index = 0; index < 4 + Math.ceil(reward.tier * .65); index++) {
        burst(field.primaryX + field.playWidth * rand(.65, .94), field.primaryY + field.playHeight * rand(.18, .68), index % 2 ? reward.color : colors.yellow, 8 + reward.tier * 2, 1 + reward.tier * .1);
      }
    }
  }

  function awardBoundaryScore() {
    if (ball.boundaryScoreAwarded || !Number.isFinite(ball.edgeHeight)) return;
    const reward = edgeReward(ball.edgeHeight);
    ball.boundaryScoreAwarded = true;
    ball.boundaryPoints = reward.points;
    score += reward.points;
  }

  function updateBattedBall(dt) {
    const field = scene();
    const gravity = field.playHeight * 1.08 * (ball.gravityScale || 1);
    ball.spinPhase += ball.spinRate * dt;
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;
    ball.vz -= gravity * dt;
    ball.depth += ball.depthV * dt;
    ball.depthV *= Math.pow(.34, dt);
    ball.maxHeight = Math.max(ball.maxHeight, ball.z);
    ball.r = ball.baseR;

    if (ball.z <= ball.r) {
      ball.z = ball.r;
      if (!ball.grounded && Math.abs(ball.vz) > field.playHeight * .075 && ball.bounces < 2) {
        ball.vz = -ball.vz * ball.bounce;
        ball.vx *= .76;
        ball.bounces++;
        burst(ball.x, field.ground - 2, colors.cream, 5, .35);
      } else {
        ball.grounded = true;
        ball.vz = 0;
      }
    }
    if (ball.grounded) {
      ball.vx *= Math.pow(.075, dt);
      ball.spinRate *= Math.pow(.2, dt);
    }
    ball.predictedX = predictedLandingX();
    recordBallTrail(
      ball.x,
      field.ground,
      ball.z,
      ball.r,
      ball.grounded ? "ground" : "hit"
    );

    updateDefenders(dt);
    if (checkFielderPlay()) return;
    const primaryEdgeX = field.primaryRight - Math.max(2, ball.r * .35);
    const crossedPrimaryEdge = ball.x >= primaryEdgeX;
    const primaryEdgeY = clamp(field.ground - ball.z + ball.depth * .1, field.primaryY + 12, field.ground - 5);
    if (crossedPrimaryEdge && !ball.primaryEdgeCrossed) {
      ball.primaryEdgeCrossed = true;
      ball.edgeHeight = clamp((field.ground - primaryEdgeY) / Math.max(1, field.playHeight), 0, 1);
      const reward = edgeReward(ball.edgeHeight);
      awardBoundaryScore();
      playBoundaryExitEffect(primaryEdgeY, reward, field.primaryRight - 1);
      ball.edgeBurst = true;
    }

    const finishedBoundaryFlight = ball.primaryEdgeCrossed;
    if (ball.homerCandidate && finishedBoundaryFlight && edgeReward(ball.edgeHeight || 0).tier >= 1) {
      resolveHit("HOME RUN");
      return;
    }
    const safelyExpired = phaseTime > 8 || (phaseTime > 4.5 && ball.grounded);
    const beyondVisibleDesktop = ball.x > field.primaryRight + 40;
    if ((ball.grounded && Math.abs(ball.vx) < 28) || beyondVisibleDesktop || safelyExpired) resolveHit("HIT");
  }

  function missPitch() {
    strikes++;
    phase = "return";
    phaseTime = 0;
    lastOutcome = "STRIKE";
    catcherState = "receive";
    catcherTime = 0;
    swing.outcome = "MISS";
    const field = scene();
    if (ball) {
      ball.owner = "catcher";
      ball.returnStart = null;
      ball.returning = false;
      ball.returned = false;
      ball.x = field.catcher.x + 8 * field.unit;
      ball.y = field.ground - 10 * field.unit;
      ball.z = 0;
      ball.depth = 0;
      ball.trail = [];
    }
    addFeedback(`STRIKE ${strikes}`, field.batter.x + 18 * field.unit, field.ground - 34 * field.unit, colors.red, 11, .9);
  }

  function jointWorld(role, clip, time, joint) {
    const field = scene();
    const catcher = role === "catcher";
    const scale = field.actorScale * (catcher ? 1.04 : .96);
    const facing = catcher ? 1 : -1;
    const rig = window.StickMotion.resolvedPose(clip, time);
    return {
      x: (catcher ? field.catcher.x : field.pitcher.x) + rig[joint][0] * facing * scale,
      y: field.ground + rig[joint][1] * scale
    };
  }

  function setReturnBallAt(point, owner) {
    if (!ball) return;
    ball.x = point.x;
    ball.y = point.y;
    ball.z = 0;
    ball.depth = 0;
    ball.r = ball.baseR;
    ball.owner = owner;
  }

  function updateReturnCycle(dt) {
    if (!ball) return;
    const t = catcherTime;
    if (t >= CATCH_RELEASE_AT && t < RETURN_ARRIVE_AT) ball.spinPhase += ball.spinRate * dt;
    if (t < CATCH_RECEIVE_END) {
      catcherState = "receive";
      setReturnBallAt(jointWorld("catcher", "catcherReceive", t, GLOVE_HAND), "catcher");
      return;
    }
    if (t < CATCH_RELEASE_AT) {
      catcherState = "throw";
      const local = t - CATCH_RECEIVE_END;
      const hand = local < .16 ? GLOVE_HAND : THROWING_HAND;
      setReturnBallAt(jointWorld("catcher", "catcherThrow", local, hand), "catcher");
      return;
    }
    if (t < RETURN_ARRIVE_AT) {
      catcherState = "throw";
      if (!ball.returnStart) {
        ball.returnStart = jointWorld("catcher", "catcherThrow", CATCH_RELEASE_AT - CATCH_RECEIVE_END, THROWING_HAND);
        ball.trail = [];
      }
      const destination = jointWorld("pitcher", "pitcherReceive", RETURN_ARRIVE_AT - PITCHER_RECEIVE_START, "handL");
      const progress = smooth((t - CATCH_RELEASE_AT) / (RETURN_ARRIVE_AT - CATCH_RELEASE_AT));
      ball.x = lerp(ball.returnStart.x, destination.x, progress);
      ball.y = lerp(ball.returnStart.y, destination.y, progress) - Math.sin(progress * Math.PI) * 22 * scene().unit;
      ball.z = 0;
      ball.depth = 0;
      ball.owner = null;
      ball.returning = true;
      recordBallTrail(ball.x, ball.y, 0, ball.r, "return");
      return;
    }

    catcherState = t < CATCH_RECEIVE_END + window.StickMotion.clips.catcherThrow.duration ? "throw" : "ready";
    ball.returning = false;
    ball.returned = true;
    setReturnBallAt(
      jointWorld("pitcher", "pitcherReceive", clamp(t - PITCHER_RECEIVE_START, 0, window.StickMotion.clips.pitcherReceive.duration), GLOVE_HAND),
      "pitcher"
    );
    if (t >= RETURN_END) {
      if (strikes >= 3) {
        endGame("STRIKE OUT");
      } else {
        phase = "transfer";
        phaseTime = 0;
        pitchClock = -1;
        catcherState = "ready";
        resetSwing();
      }
    }
  }

  function updatePitcherTransfer() {
    if (!ball) return;
    const duration = window.StickMotion.clips.pitcherTransfer.duration;
    const local = clamp(phaseTime, 0, duration);
    const glove = jointWorld("pitcher", "pitcherTransfer", local, GLOVE_HAND);
    const throwingHand = jointWorld("pitcher", "pitcherTransfer", local, THROWING_HAND);
    const transfer = smooth(clamp((phaseTime / duration - .2) / .62, 0, 1));
    setReturnBallAt({ x: lerp(glove.x, throwingHand.x, transfer), y: lerp(glove.y, throwingHand.y, transfer) }, "pitcher");
    ball.returned = true;
    if (phaseTime >= PITCHER_TRANSFER_DURATION) preparePitch();
  }

  function endGame(reason) {
    if (phase === "gameover") return;
    savePersonalBest();
    phase = "gameover";
    phaseTime = 0;
    lastOutcome = reason;
    gameOverReason.textContent = reason;
    finalScoreOutput.textContent = score.toLocaleString();
    document.body.classList.add("result-open");
    gameOverPanel.hidden = false;
    window.desktopGame.setInteractive(true);
    prepareRankingEntry();
    setTimeout(() => restartButton.focus(), 50);
  }

  function updateEffects(dt) {
    shake *= Math.pow(.018, dt);
    particles.forEach((particle) => {
      particle.age = (particle.age || 0) + dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.wobble) particle.y += Math.sin(particle.age * particle.wobbleRate + particle.phase) * particle.wobble * dt;
      particle.vx *= Math.pow(particle.drag ?? .11, dt);
      particle.vy = particle.vy * Math.pow(particle.dragY ?? .24, dt) + (particle.gravity ?? 95) * dt;
      if (Number.isFinite(particle.rotation)) particle.rotation += (particle.spin || 0) * dt;
      particle.life -= dt;
    });
    feedbacks.forEach((feedback) => {
      feedback.y -= 18 * dt;
      feedback.life -= dt;
    });
    impactLines.forEach((line) => { line.life -= dt; });
    impactRings.forEach((ring) => {
      ring.life -= dt;
      const progress = 1 - clamp(ring.life / ring.maxLife, 0, 1);
      ring.radius = lerp(ring.startRadius || 4, ring.maxRadius, smooth(progress));
    });
    edgeBlasts.forEach((blast) => { blast.life -= dt; });
    if (impactPunch) {
      impactPunch.life -= dt;
      if (impactPunch.releaseLife > 0) impactPunch.releaseLife -= dt;
    }
    particles = particles.filter((particle) => particle.life > 0);
    feedbacks = feedbacks.filter((feedback) => feedback.life > 0);
    impactLines = impactLines.filter((line) => line.life > 0);
    impactRings = impactRings.filter((ring) => ring.life > 0);
    edgeBlasts = edgeBlasts.filter((blast) => blast.life > 0);
    if (impactPunch?.life <= 0) impactPunch = null;
  }

  function update(dt) {
    if (performance.now() < effectPreviewUntil) {
      updateEffects(dt);
      return;
    }
    if (paused) return;
    if (impactFreeze > 0) {
      const wasFrozen = impactFreeze;
      impactFreeze = Math.max(0, impactFreeze - dt);
      if (wasFrozen > 0 && impactFreeze === 0 && impactPunch) {
        impactPunch.released = true;
        impactPunch.releaseLife = impactPunch.perfect ? .2 : .14;
        shake = Math.max(shake, impactPunch.perfect ? 11 : 7);
      }
      // Effects almost stop with the actors and ball. The tiny amount of
      // motion prevents a frozen desktop from looking like an app hang.
      updateEffects(dt * .1);
      return;
    }
    phaseTime += dt;
    catcherTime += dt;
    if (pitchClock >= 0) {
      pitchClock += dt;
      if (pitchClock > 3.16) pitchClock = -1;
    }
    updateBatControl(dt);
    updateEffects(dt);

    if (phase === "waiting" && phaseTime >= nextPitchDelay) preparePitch();
    if (phase === "windup" && pitchClock >= 1.28) {
      phase = "pitch";
      phaseTime = 0;
    }
    if (phase === "pitch") updatePitchBall(dt);
    if (phase === "return") updateReturnCycle(dt);
    if (phase === "transfer") updatePitcherTransfer();
    if (phase === "flight") updateBattedBall(dt);
    if (phase === "result" && phaseTime > 1.75) {
      phase = "waiting";
      phaseTime = 0;
      nextPitchDelay = rand(1.15, 2.2);
      ball = null;
      resetSwing();
      resetDefenders();
    }
  }

  function pitcherAnimation() {
    if (phase === "transfer") {
      return { clip: "pitcherTransfer", time: stepTime(clamp(phaseTime, 0, window.StickMotion.clips.pitcherTransfer.duration)) };
    }
    if (phase === "return" && catcherTime >= PITCHER_RECEIVE_START) {
      return {
        clip: "pitcherReceive",
        time: stepTime(clamp(catcherTime - PITCHER_RECEIVE_START, 0, window.StickMotion.clips.pitcherReceive.duration))
      };
    }
    if (["return", "flight", "result"].includes(phase) && pitchClock < 0) {
      return { clip: "pitcherFieldReady", time: stepTime(performance.now() / 1000) };
    }
    if (pitchClock < 0) return { clip: "pitcherSet", time: stepTime(performance.now() / 1000) };
    if (pitchClock < 1.28) return { clip: "pitcherWindup", time: stepTime(pitchClock) };
    if (pitchClock < 2.3) return { clip: "pitcherThrow", time: stepTime(pitchClock - 1.28) };
    return { clip: "pitcherRecover", time: stepTime(pitchClock - 2.3) };
  }

  function pitcherHeldBall() {
    if (!ball || ball.released || pitchClock < 0) return null;
    const field = scene();
    const scale = field.actorScale * .96;
    const clip = pitchClock < 1.28 ? "pitcherWindup" : "pitcherThrow";
    const time = pitchClock < 1.28 ? pitchClock : pitchClock - 1.28;
    const hand = window.StickMotion.resolvedPose(clip, time)[THROWING_HAND];
    return {
      x: field.pitcher.x - hand[0] * scale,
      y: field.ground + hand[1] * scale,
      z: 0,
      depth: 0,
      r: ball.baseR,
      held: true
    };
  }

  function drawActor(x, ground, role, scale, index = -1, overrides = null, forcedAnimation = null, rigOptions = null) {
    let animation = { clip: "idle", time: stepTime(performance.now() / 1000 + x * .001) };
    if (role === "pitcher") animation = pitcherAnimation();
    if (role === "batter") animation = forcedAnimation || batterAnimation();
    if (role === "catcher") {
      if (catcherState === "receive") animation = { clip: "catcherReceive", time: stepTime(catcherTime) };
      else if (catcherState === "throw") animation = {
        clip: "catcherThrow",
        time: stepTime(clamp(catcherTime - CATCH_RECEIVE_END, 0, window.StickMotion.clips.catcherThrow.duration))
      };
      else animation = { clip: "catcherReady", time: stepTime(performance.now() / 1000) };
    }
    if (role === "fielder") {
      const defender = defenders[index];
      if (defender.state === "catch") animation = { clip: "fielderCatch", time: stepTime(defender.stateTime) };
      else if (defender.state === "ground") animation = { clip: "fielderGround", time: stepTime(defender.stateTime) };
      else if (defender.state === "miss") animation = { clip: "fielderMiss", time: stepTime(defender.stateTime) };
      else if (Math.abs(defender.vx) > 3) animation = { clip: "fielderRun", time: stepTime(defender.runPhase) };
      else animation = { clip: "fielderReady", time: stepTime(performance.now() / 1000 + x * .001) };
    }
    let roleDepth = null;
    if (role === "pitcher") {
      let armZL = .3;
      let armZR = -.28;
      if (animation.clip === "pitcherThrow") {
        const progress = clamp(animation.time / window.StickMotion.clips.pitcherThrow.duration, 0, 1);
        armZL = lerp(.3, -.12, smooth(progress));
        armZR = lerp(-.62, .68, smooth((progress - .18) / .46));
      } else if (animation.clip === "pitcherRecover" || animation.clip === "pitcherFieldReady") {
        armZL = -.08;
        armZR = .28;
      }
      roleDepth = { armZL, armZR, depthCue: .64 };
    } else if (role === "catcher") {
      let armZL = .48;
      let armZR = -.34;
      if (animation.clip === "catcherThrow") {
        const progress = clamp(animation.time / window.StickMotion.clips.catcherThrow.duration, 0, 1);
        armZL = lerp(.28, -.1, smooth(progress));
        armZR = lerp(-.64, .64, smooth((progress - .34) / .34));
      }
      roleDepth = { armZL, armZR, depthCue: .64 };
    }
    const effectiveRigOptions = roleDepth || rigOptions ? { ...(roleDepth || {}), ...(rigOptions || {}) } : null;
    window.StickMotion.draw(ctx, {
      x, ground, scale,
      facing: role === "batter" || role === "catcher" ? 1 : -1,
      clip: animation.clip, time: animation.time,
      glove: role === "fielder" || role === "pitcher" || role === "catcher",
      overrides,
      rigOptions: effectiveRigOptions
    });
  }

  function drawBat(bat) {
    const field = scene();
    const tier = activeBatTier();
    const depthMix = clamp(Math.abs(bat.depth), 0, 1);
    const signedDepth = bat.depth >= 0 ? depthMix : -depthMix;
    const rim = batColor(tier.rim, signedDepth * .45);
    const handleInk = batColor(tier.handle, signedDepth);
    const middleInk = batColor(tier.middle, signedDepth);
    const tipInk = batColor(tier.tip, signedDepth);
    const shineInk = batColor(tier.shine, Math.max(0, signedDepth) * .35);
    const batGradient = ctx.createLinearGradient(bat.x1, bat.y1, bat.x2, bat.y2);
    batGradient.addColorStop(0, handleInk);
    batGradient.addColorStop(.18, middleInk);
    batGradient.addColorStop(.62, middleInk);
    batGradient.addColorStop(1, tipInk);
    if (previousDisplayBat) {
      const smearDistance = Math.hypot(bat.x2 - previousDisplayBat.x2, bat.y2 - previousDisplayBat.y2);
      if (smearDistance > 5 * field.unit) {
        ctx.save();
        ctx.globalAlpha = clamp(smearDistance / (55 * field.unit), .16, .42);
        ctx.fillStyle = middleInk;
        ctx.beginPath();
        ctx.moveTo(previousDisplayBat.x1, previousDisplayBat.y1);
        ctx.lineTo(previousDisplayBat.x2, previousDisplayBat.y2);
        ctx.lineTo(bat.x2, bat.y2);
        ctx.lineTo(bat.x1, bat.y1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    const barrel = { x: lerp(bat.x1, bat.x2, .56), y: lerp(bat.y1, bat.y2, .56) };
    ctx.lineCap = "round";
    ctx.strokeStyle = rim;
    ctx.lineWidth = bat.width + 1.6 * field.unit;
    ctx.beginPath(); ctx.moveTo(bat.x1, bat.y1); ctx.lineTo(bat.x2, bat.y2); ctx.stroke();
    ctx.strokeStyle = batGradient;
    ctx.lineWidth = bat.width * .72;
    ctx.beginPath(); ctx.moveTo(bat.x1, bat.y1); ctx.lineTo(bat.x2, bat.y2); ctx.stroke();
    ctx.lineWidth = bat.width * 1.26;
    ctx.beginPath(); ctx.moveTo(barrel.x, barrel.y); ctx.lineTo(bat.x2, bat.y2); ctx.stroke();
    ctx.strokeStyle = shineInk;
    ctx.globalAlpha = .58;
    ctx.lineWidth = Math.max(.45, bat.width * .2);
    ctx.beginPath(); ctx.moveTo(barrel.x, barrel.y); ctx.lineTo(bat.x2, bat.y2); ctx.stroke();
    ctx.globalAlpha = 1;
    if (Math.abs(bat.depth) > .72) {
      ctx.fillStyle = tipInk;
      const endRadius = Math.max(bat.width * 1.12, 2.1 * field.unit);
      ctx.beginPath(); ctx.ellipse(bat.x2, bat.y2, endRadius, endRadius * .78, bat.angle, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rim;
      ctx.lineWidth = Math.max(.7, field.unit);
      ctx.stroke();
    }
  }

  function drawBatSwingTrail(currentBat, layer) {
    if (!["forward", "impact", "follow"].includes(swing.phase)) return;
    const field = scene();
    const tier = activeBatTier();
    const frames = batContactTrail
      .filter((frame) => frame.age < .25 && frame.speed > 105)
      .map((frame) => ({ ...frame.bat, age: frame.age, speed: frame.speed }));
    if (!frames.length) return;
    frames.push({ ...currentBat, age: 0, speed: bat3d.tipSpeed });

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let index = 1; index < frames.length; index++) {
      const from = frames[index - 1];
      const to = frames[index];
      const segmentLayer = to.depth < -.18 ? "back" : "front";
      if (segmentLayer !== layer) continue;
      const distance = Math.hypot(to.x2 - from.x2, to.y2 - from.y2);
      if (distance < .7 * field.unit) continue;
      const speedFactor = clamp((Math.max(from.speed, to.speed) - 90) / 780, 0, 1);
      const ageFade = clamp(1 - from.age / .25, 0, 1);
      const depthLight = clamp((to.depth + 1) * .5, 0, 1);
      const perspective = clamp(to.perspective || 1, .62, 1.38);
      const projectedLength = Math.hypot(to.x2 - to.x1, to.y2 - to.y1);
      const naturalLength = 58 * field.actorScale * 1.08 * perspective;
      const foreshorten = clamp(projectedLength / Math.max(1, naturalLength), .18, 1);
      const endOn = smooth((Math.abs(to.depth) - .55) / .4);
      const depthWeight = lerp(.62, 1.16, depthLight);
      const fromInner = {
        x: lerp(from.x1, from.x2, .52),
        y: lerp(from.y1, from.y2, .52)
      };
      const toInner = {
        x: lerp(to.x1, to.x2, .52),
        y: lerp(to.y1, to.y2, .52)
      };

      // A translucent swept surface reveals the full barrel path, while the
      // brighter outer edge makes the direction legible at stick-figure scale.
      ctx.globalAlpha = ageFade * lerp(.045, .19, speedFactor) * lerp(.55, 1, foreshorten) * depthWeight;
      ctx.fillStyle = batColor(tier.middle, to.depth < -.18 ? -.45 : .35);
      ctx.beginPath();
      ctx.moveTo(fromInner.x, fromInner.y);
      ctx.lineTo(from.x2, from.y2);
      ctx.lineTo(to.x2, to.y2);
      ctx.lineTo(toInner.x, toInner.y);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = ageFade * lerp(.18, .56, speedFactor) * depthWeight * lerp(.6, 1, foreshorten);
      ctx.strokeStyle = batColor(tier.shine, .2);
      ctx.lineWidth = (.8 + speedFactor * 2.8) * field.unit * perspective * lerp(.56, 1, foreshorten);
      ctx.shadowColor = batColor(tier.tip, .18);
      ctx.shadowBlur = speedFactor * 4 * field.unit;
      ctx.beginPath();
      ctx.moveTo(from.x2, from.y2);
      ctx.lineTo(to.x2, to.y2);
      ctx.stroke();

      // When the barrel points into the camera, its projected path collapses.
      // Replace the missing long streak with a compact perspective smear.
      if (endOn > .04) {
        const facingFront = to.depth >= 0;
        const radius = Math.max(1.2 * field.unit, to.width * lerp(1.35, 2.35, endOn) * perspective);
        ctx.globalAlpha = ageFade * endOn * speedFactor * (facingFront ? .34 : .15);
        ctx.fillStyle = batColor(facingFront ? tier.tip : tier.handle, facingFront ? .3 : -.35);
        ctx.shadowColor = facingFront ? batColor(tier.shine, .12) : "transparent";
        ctx.shadowBlur = facingFront ? 4 * field.unit * endOn : 0;
        ctx.beginPath();
        ctx.ellipse(to.x2, to.y2, radius, radius * lerp(.34, .72, foreshorten), to.angle, 0, Math.PI * 2);
        ctx.fill();
      }

      if (index >= frames.length - 4) {
        ctx.globalAlpha = ageFade * lerp(.3, .72, speedFactor);
        ctx.strokeStyle = batColor(tier.shine, .28);
        ctx.lineWidth = Math.max(.55, (.42 + speedFactor * .46) * field.unit);
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(from.x2, from.y2);
        ctx.lineTo(to.x2, to.y2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBatter(bat) {
    const field = scene();
    bat ||= batPose();
    const scale = field.actorScale * 1.08;
    const animation = batterAnimation();
    const rig = window.StickMotion.pose(animation.clip, animation.time);
    const knobHand = [(bat.x1 - field.batter.x) / scale, (bat.y1 - field.ground) / scale];
    const barrelHand = [(bat.gripX - field.batter.x) / scale, (bat.gripY - field.ground) / scale];
    const barrelRight = bat.x2 >= bat.x1;
    // As the barrel crosses the camera plane, the visible left/right order of
    // the hands reverses. Swapping at the shortest projection prevents both
    // arms from crossing through the chest while keeping each hand on the grip.
    const handL = barrelRight ? knobHand : barrelHand;
    const handR = barrelRight ? barrelHand : knobHand;
    const motionProgress = clamp(swing.progress, 0, 1);
    const bodyTurn = Math.sin(motionProgress * Math.PI);
    const wrap = ["follow", "recover"].includes(swing.phase)
      ? smooth((motionProgress - .78) / .22)
      : 0;
    const armExtension = smooth((motionProgress - .43) / .32) * (1 - wrap * .72);
    const torsoDx = rig.shoulder[0] - rig.hip[0];
    const torsoDy = rig.shoulder[1] - rig.hip[1];
    const torsoLength = Math.max(1, Math.hypot(torsoDx, torsoDy));
    const side = [-torsoDy / torsoLength, torsoDx / torsoLength];
    const shoulderHalfWidth = 4.5 * (1 - bodyTurn * .52);
    const shoulderL = [rig.shoulder[0] - side[0] * shoulderHalfWidth, rig.shoulder[1] - side[1] * shoulderHalfWidth];
    const shoulderR = [rig.shoulder[0] + side[0] * shoulderHalfWidth, rig.shoulder[1] + side[1] * shoulderHalfWidth];
    // Both elbows take the outside branch. These are final screen-space joints,
    // not merely IK hints, so the arms cannot flip or detach at an end-on bat.
    const elbowRatio = lerp(.42, .52, armExtension);
    const elbowDrop = lerp(8.5, 1.8, armExtension) + wrap * 3.5;
    const elbowSide = lerp(5, 1.2, armExtension);
    const elbowL = [
      lerp(shoulderL[0], handL[0], elbowRatio) - elbowSide - wrap,
      lerp(shoulderL[1], handL[1], elbowRatio) + elbowDrop
    ];
    const elbowR = [
      lerp(shoulderR[0], handR[0], elbowRatio) + elbowSide + wrap,
      lerp(shoulderR[1], handR[1], elbowRatio) + elbowDrop
    ];
    const gripDepth = Math.abs(bat.depth);
    const rigOptions = {
      depth: bat.depth,
      bodyTurn,
      armDepthL: gripDepth * .7,
      armDepthR: gripDepth * .95,
      // Each hand occupies a different point along the bat's Z axis. Their
      // ordering swaps only when those continuous depths actually cross.
      armZL: bat.depth * (barrelRight ? .28 : .82),
      armZR: bat.depth * (barrelRight ? .82 : .28),
      lockArms: true,
      depthCue: .62 + bodyTurn * .1
    };
    drawBatSwingTrail(bat, "back");
    if (bat.depth < -.18) drawBat(bat);
    drawActor(field.batter.x, field.ground, "batter", scale, -1, { handL, handR, elbowL, elbowR }, animation, rigOptions);
    drawBatSwingTrail(bat, "front");
    if (bat.depth >= -.18) drawBat(bat);
  }

  function drawFielders() {
    const field = scene();
    defenders.forEach((defender, index) => {
      drawActor(defender.x, field.ground, "fielder", field.actorScale * (defender.kind === "infield" ? .92 : .84), index);
    });
  }

  function drawBall(shown) {
    if (!shown) return;
    const field = scene();
    const screenY = Math.min(
      shown.y - (shown.z || 0) + (shown.depth || 0) * .1,
      field.ground - shown.r
    );
    const activeMagic = phase === "pitch" && ball?.released && !ball.hit ? ball.magicEffect : null;
    const pitchProgress = clamp(ball?.t || 0, 0, 1);
    let visibility = 1;
    if (activeMagic === "vanish") {
      const disappear = smooth((pitchProgress - .4) / .07);
      const reappear = smooth((pitchProgress - .59) / .08);
      visibility = 1 - disappear * (1 - reappear);
    }
    if (!shown.held && ball?.trail.length) {
      const now = performance.now();
      const trail = ball.trail
        .filter((point) => (now - point.at) / 1000 < point.life)
        .map((point) => ({
          ...point,
          screenY: Math.min(point.y - (point.z || 0), scene().ground - point.r),
          fade: clamp(1 - (now - point.at) / 1000 / point.life, 0, 1)
        }));

      if (trail.length) {
        trail.push({ x: shown.x, screenY, r: shown.r, fade: 1, speed: trail[trail.length - 1].speed });
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = colors.cream;
        ctx.shadowBlur = shown.r * .55;

        // Draw a tapered ribbon one curved segment at a time. Age controls
        // opacity while speed controls thickness, so a bounce naturally loses
        // its tail instead of leaving a rigid full-strength line behind it.
        for (let index = 1; index < trail.length; index++) {
          const from = trail[index - 1];
          const to = trail[index];
          const progress = index / Math.max(1, trail.length - 1);
          const speedFactor = clamp(((to.speed || 0) - 65) / 720, 0, 1);
          const alpha = from.fade * lerp(.025, .2, progress) * lerp(.5, 1, speedFactor);
          if (alpha < .008) continue;
          const midX = (from.x + to.x) * .5;
          const midY = (from.screenY + to.screenY) * .5;
          ctx.globalAlpha = alpha * visibility;
          ctx.strokeStyle = colors.cream;
          ctx.lineWidth = Math.max(.6, lerp(from.r * .22, to.r * 1.05, progress));
          ctx.beginPath();
          ctx.moveTo(from.x, from.screenY);
          ctx.quadraticCurveTo(from.x, from.screenY, midX, midY);
          ctx.quadraticCurveTo(to.x, to.screenY, to.x, to.screenY);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    if (!shown.held && visibility > .04) {
      const airHeight = Math.max(0, field.ground - screenY);
      const heightFade = clamp(airHeight / (field.playHeight * .38), 0, 1);
      const depthShift = (shown.depth || 0) * .055;
      const shadowRadius = shown.r * lerp(1.42, .5, heightFade);
      ctx.save();
      ctx.globalAlpha = visibility * lerp(.3, .055, heightFade);
      ctx.fillStyle = "#000000";
      ctx.filter = `blur(${lerp(.4, 2.8, heightFade)}px)`;
      ctx.beginPath();
      ctx.ellipse(shown.x + depthShift, field.ground - .55 * field.unit, shadowRadius * 1.55, shadowRadius * .38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const drawBallMark = (x, y, radius, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(0,0,0,.56)";
      ctx.shadowBlur = Math.max(2, radius * 1.35);
      ctx.shadowOffsetY = Math.max(.35, radius * .16);
      const sphere = ctx.createRadialGradient(
        x - radius * .38, y - radius * .42, Math.max(.12, radius * .08),
        x + radius * .08, y + radius * .1, radius * 1.08
      );
      sphere.addColorStop(0, "#ffffff");
      sphere.addColorStop(.38, "#fffdf3");
      sphere.addColorStop(.72, "#e6dfc9");
      sphere.addColorStop(1, "#817966");
      ctx.fillStyle = sphere;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, radius * .94, 0, Math.PI * 2); ctx.clip();
      ctx.translate(x, y);
      ctx.rotate((ball?.spinTilt || 0) + Math.sin(ball?.spinPhase || 0) * .08);
      const spin = ball?.spinPhase || 0;
      const seamSquash = .22 + Math.abs(Math.cos(spin)) * .72;
      const seamTravel = Math.sin(spin) * radius * .34;
      ctx.strokeStyle = "rgba(177,38,34,.96)";
      ctx.lineWidth = Math.max(.55, radius * .2);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.ellipse(-radius * .34 + seamTravel, 0, radius * .5, radius * .86 * seamSquash, .05, -1.22, 1.22);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(radius * .34 + seamTravel, 0, radius * .5, radius * .86 * seamSquash, .05, Math.PI - 1.22, Math.PI + 1.22);
      ctx.stroke();
      ctx.restore();

      ctx.globalAlpha = alpha * .78;
      ctx.fillStyle = "rgba(255,255,255,.94)";
      ctx.beginPath();
      ctx.ellipse(x - radius * .33, y - radius * .38, radius * .2, radius * .12, -.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(48,43,35,.72)";
      ctx.lineWidth = Math.max(.45, radius * .11);
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };

    if (activeMagic === "illusion" && pitchProgress > .27 && pitchProgress < .83) {
      const illusionProgress = clamp((pitchProgress - .27) / .56, 0, 1);
      const split = Math.sin(illusionProgress * Math.PI);
      const ghosts = [[-6, -19], [5, -9], [-4, 9], [6, 19]];
      for (const [offsetX, offsetY] of ghosts) {
        drawBallMark(
          shown.x + offsetX * field.unit * split,
          screenY + offsetY * field.unit * split,
          shown.r,
          .16 + split * .44
        );
      }
    }
    drawBallMark(shown.x, screenY, shown.r, visibility);
    ctx.globalAlpha = 1;
  }

  function applyImpactCamera() {
    if (!impactPunch) return;
    const freezeRatio = impactFreezeMax > 0 ? clamp(impactFreeze / impactFreezeMax, 0, 1) : 0;
    const releaseDuration = impactPunch.perfect ? .2 : .14;
    const releaseRatio = clamp(impactPunch.releaseLife / releaseDuration, 0, 1);
    const scale = impactFreeze > 0
      ? 1 + impactPunch.strength * lerp(.011, .019, freezeRatio)
      : 1 - impactPunch.strength * .007 * releaseRatio;
    ctx.translate(impactPunch.x, impactPunch.y);
    ctx.scale(scale, scale);
    ctx.translate(-impactPunch.x, -impactPunch.y);
  }

  function drawHeavyHitStop() {
    if (!impactPunch) return;
    const freezeRatio = impactFreezeMax > 0 ? clamp(impactFreeze / impactFreezeMax, 0, 1) : 0;
    const releaseDuration = impactPunch.perfect ? .2 : .14;
    const releaseRatio = clamp(impactPunch.releaseLife / releaseDuration, 0, 1);
    if (freezeRatio <= 0 && releaseRatio <= 0) return;
    const strength = impactPunch.strength;
    const radius = lerp(17, impactPunch.perfect ? 37 : 29, strength);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(impactPunch.x, impactPunch.y);

    if (freezeRatio > 0) {
      const compression = 1 - freezeRatio;
      ctx.globalAlpha = lerp(.48, .9, strength) * lerp(.72, 1, freezeRatio);
      ctx.strokeStyle = impactPunch.perfect ? "#ffffff" : colors.yellow;
      ctx.lineWidth = impactPunch.perfect ? 2.8 : 2;
      ctx.shadowColor = impactPunch.perfect ? "#ffffff" : colors.yellow;
      ctx.shadowBlur = impactPunch.perfect ? 14 : 8;
      // Four inward compression blades hold on the contact point while every
      // gameplay object is frozen, creating a deliberate freeze-frame image.
      for (let index = 0; index < 4; index++) {
        const angle = Math.PI * .25 + index * Math.PI * .5;
        const outer = radius * lerp(1.2, .92, compression);
        const inner = radius * .28;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.lineTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -3.2 - strength * 2);
      ctx.lineTo(2.3 + strength, 0);
      ctx.lineTo(0, 3.2 + strength * 2);
      ctx.lineTo(-2.3 - strength, 0);
      ctx.closePath();
      ctx.fill();
    }

    if (releaseRatio > 0) {
      const released = 1 - releaseRatio;
      const size = radius * lerp(.5, 1.75, smooth(released));
      ctx.rotate(Math.PI * .25);
      ctx.globalAlpha = Math.pow(releaseRatio, 1.5) * .78;
      ctx.strokeStyle = impactPunch.perfect ? colors.blue : colors.yellow;
      ctx.lineWidth = lerp(3, .8, released);
      ctx.strokeRect(-size, -size, size * 2, size * 2);
    }
    ctx.restore();
  }

  function drawEdgeBlasts() {
    for (const blast of edgeBlasts) {
      const progress = clamp(1 - blast.life / blast.maxLife, 0, 1);
      const elapsed = blast.maxLife - blast.life;
      const tier = blast.tier || 0;
      const style = blast.style || "chip";
      const rgb = blast.rgb || "85,195,212";
      const fade = Math.pow(1 - progress, 1.35);
      const flash = Math.pow(clamp(1 - progress / .24, 0, 1), 2);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Top-tier contact briefly illuminates the whole transparent desktop,
      // making a MOON SHOT read as a different event rather than a larger copy.
      if (style === "nova" && flash > .01) {
        ctx.globalAlpha = flash * .18;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      // A clipped radial flash makes the light source feel as if it exists
      // beyond the desktop, on the other side of the monitor boundary.
      if (flash > .01) {
        const glowRadius = blast.radius * lerp(.8, 1.55, progress);
        const glow = ctx.createRadialGradient(blast.x, blast.y, 0, blast.x, blast.y, glowRadius);
        glow.addColorStop(0, "rgba(255,255,255,.96)");
        glow.addColorStop(.22, `rgba(${rgb},.72)`);
        glow.addColorStop(1, `rgba(${rgb},0)`);
        ctx.globalAlpha = flash;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(blast.x, blast.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // A narrow energy wedge points back along the ball's flight path. This
      // replaces the circular hit burst and gives the boundary its own shape.
      const beamAlpha = Math.pow(clamp(1 - progress / .38, 0, 1), 1.5);
      if (beamAlpha > .01 && style !== "chip") {
        const beamLength = blast.radius * lerp(2.5 + tier * .7, 1.15, progress);
        const beamHalf = blast.radius * lerp(.2 + tier * .035, .04, progress);
        const beam = ctx.createLinearGradient(blast.x - beamLength, blast.y, blast.x, blast.y);
        beam.addColorStop(0, `rgba(${rgb},0)`);
        beam.addColorStop(.72, `rgba(${rgb},.42)`);
        beam.addColorStop(1, "rgba(255,255,255,.96)");
        ctx.globalAlpha = beamAlpha;
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(blast.x, blast.y - 2);
        ctx.lineTo(blast.x - beamLength, blast.y - beamHalf);
        ctx.lineTo(blast.x - beamLength, blast.y + beamHalf);
        ctx.lineTo(blast.x, blast.y + 2);
        ctx.closePath();
        ctx.fill();
      }

      // SKY SHOT and MOON SHOT throw a separate horizontal energy lane across
      // the right side of the monitor before the normal wedge collapses.
      if (style === "prism" || style === "nova") {
        const laneAlpha = Math.pow(clamp(1 - progress / .3, 0, 1), 1.4) * (.42 + tier * .13);
        const laneLength = width * (style === "nova" ? .48 : .34) * lerp(1, .62, progress);
        const laneHalf = lerp(6 + tier * 3, 1, progress);
        const lane = ctx.createLinearGradient(blast.x - laneLength, blast.y, blast.x, blast.y);
        lane.addColorStop(0, "rgba(255,255,255,0)");
        lane.addColorStop(.55, style === "nova" ? "rgba(255,255,255,.34)" : `rgba(${rgb},.28)`);
        lane.addColorStop(1, "rgba(255,255,255,.95)");
        ctx.globalAlpha = laneAlpha;
        ctx.fillStyle = lane;
        ctx.fillRect(blast.x - laneLength, blast.y - laneHalf, laneLength, laneHalf * 2);
      }

      // Concentric half-shockwaves are clipped by the physical screen edge.
      // Their staggered timing reads as the boundary itself being punctured.
      const waveCount = { chip: 1, dust: 1, slice: 2, pulse: 5, spiral: 6, prism: 7, nova: 9 }[style] || 1;
      for (let index = 0; index < waveCount; index++) {
        const wave = clamp((progress - index * .055) / .62, 0, 1);
        if (wave <= 0 || wave >= 1) continue;
        ctx.globalAlpha = Math.pow(1 - wave, 1.7) * Math.max(.18, .84 - index * .1);
        ctx.strokeStyle = index % 3 === 1 ? colors.yellow : index % 3 === 2 ? blast.color : "#ffffff";
        ctx.lineWidth = Math.max(.65, (3.4 - index * .32) * (1 - wave * .55));
        ctx.setLineDash(index % 3 === 2 ? [4, 5] : []);
        ctx.beginPath();
        ctx.arc(blast.x, blast.y, lerp(3, blast.radius * (1 + index * .19), smooth(wave)), Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Each score band has its own silhouette instead of sharing one scaled
      // explosion: dust, slashes, pulses, spirals, prisms, then a star-like nova.
      const glyph = clamp((progress - .035) / .58, 0, 1);
      if (glyph > 0 && glyph < 1 && style !== "chip") {
        ctx.save();
        ctx.translate(blast.x, blast.y);
        const glyphFade = Math.pow(1 - glyph, 1.3);
        if (style === "dust") {
          for (let index = 0; index < 4; index++) {
            const radius = lerp(4, blast.radius * (1 + index * .24), smooth(glyph));
            ctx.globalAlpha = glyphFade * (.28 - index * .045);
            ctx.strokeStyle = blast.color;
            ctx.lineWidth = 3.2 - index * .55;
            ctx.beginPath();
            ctx.ellipse(-radius * .38, index * 3 - 5, radius, radius * .18, -.08, Math.PI * .72, Math.PI * 1.32);
            ctx.stroke();
          }
        } else if (style === "slice") {
          ctx.rotate(-.48);
          for (let index = -1; index <= 1; index++) {
            const length = blast.radius * lerp(.35, 1.55, smooth(glyph)) * (1 - Math.abs(index) * .16);
            ctx.globalAlpha = glyphFade * (.76 - Math.abs(index) * .18);
            ctx.strokeStyle = index ? blast.color : "#ffffff";
            ctx.lineWidth = index ? 2.1 : 3.4;
            ctx.beginPath();
            ctx.moveTo(-length, index * 11 - length * .24);
            ctx.lineTo(length * .18, index * 11 + length * .24);
            ctx.stroke();
          }
        } else if (style === "spiral") {
          ctx.rotate(progress * 4.2);
          for (let arm = 0; arm < 3; arm++) {
            ctx.rotate(Math.PI * 2 / 3);
            ctx.globalAlpha = glyphFade * .62;
            ctx.strokeStyle = arm === 1 ? "#ffffff" : blast.color;
            ctx.lineWidth = 2.5 - arm * .35;
            ctx.beginPath();
            for (let index = 0; index <= 18; index++) {
              const t = index / 18;
              const radius = blast.radius * t * lerp(.3, 1.2, smooth(glyph));
              const angle = t * 2.4;
              const px = Math.cos(angle) * radius;
              const py = Math.sin(angle) * radius;
              if (index) ctx.lineTo(px, py); else ctx.moveTo(px, py);
            }
            ctx.stroke();
          }
        } else if (style === "prism") {
          ctx.rotate(progress * 2.25 + Math.PI * .25);
          for (let index = 0; index < 3; index++) {
            const size = lerp(7, blast.radius * (.62 + index * .28), smooth(glyph));
            ctx.globalAlpha = glyphFade * (.68 - index * .13);
            ctx.strokeStyle = index === 1 ? colors.blue : index === 2 ? colors.yellow : "#ffffff";
            ctx.lineWidth = 2.5 - index * .45;
            ctx.strokeRect(-size, -size, size * 2, size * 2);
          }
        } else if (style === "nova") {
          ctx.rotate(progress * 1.45);
          const outer = blast.radius * lerp(.42, 1.72, smooth(glyph));
          ctx.globalAlpha = glyphFade * .86;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          for (let index = 0; index < 16; index++) {
            const angle = index / 16 * Math.PI * 2;
            const radius = index % 2 ? outer * .18 : outer;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (index) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      const rayAlpha = Math.pow(clamp(1 - progress / .46, 0, 1), 1.2);
      ctx.globalAlpha = rayAlpha;
      ctx.strokeStyle = blast.color;
      ctx.lineCap = "round";
      for (const ray of blast.rays) {
        const extension = ray.length * lerp(.25, 1, smooth(clamp(progress / .32, 0, 1)));
        ctx.lineWidth = ray.width;
        ctx.beginPath();
        ctx.moveTo(blast.x - 2, blast.y);
        ctx.lineTo(blast.x + Math.cos(ray.angle) * extension, blast.y + Math.sin(ray.angle) * extension);
        ctx.stroke();
      }

      // The vertical jagged tear is unique to an edge exit and remains after
      // the initial flash, briefly making the monitor border look cracked.
      const tearAlpha = clamp(1 - progress, 0, 1) * clamp(progress / .06, 0, 1);
      ctx.globalAlpha = tearAlpha;
      ctx.lineJoin = "miter";
      ctx.shadowColor = blast.color;
      ctx.shadowBlur = 9;
      ctx.strokeStyle = blast.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      blast.tear.forEach((point, index) => {
        const x = blast.x + point.x * fade;
        const y = blast.y + point.y * lerp(.55, 1, clamp(progress / .2, 0, 1));
        if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Unlike the square hit particles, edge debris is rendered as spinning
      // triangular screen shards with deterministic trajectories.
      for (const shard of blast.shards) {
        const local = Math.max(0, elapsed - shard.delay);
        if (local <= 0) continue;
        const shardFade = clamp(1 - local / (blast.maxLife - shard.delay), 0, 1);
        const distance = shard.speed * local * (1 - local * .42);
        const x = blast.x + Math.cos(shard.angle) * distance;
        const y = blast.y + Math.sin(shard.angle) * distance + local * local * 38;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(shard.rotation + shard.spin * local);
        ctx.globalAlpha = Math.pow(shardFade, 1.4);
        ctx.fillStyle = shard.color;
        ctx.beginPath();
        ctx.moveTo(shard.size, 0);
        ctx.lineTo(-shard.size * .7, shard.size * .42);
        ctx.lineTo(-shard.size * .28, -shard.size * .68);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawEffects(layer = "front") {
    for (const line of impactLines) {
      if ((line.layer || "front") !== layer) continue;
      const elapsed = line.maxLife - line.life;
      if (elapsed < (line.delay || 0)) continue;
      const progress = clamp((elapsed - (line.delay || 0)) / Math.max(.001, line.maxLife - (line.delay || 0)), 0, 1);
      const head = lerp(line.start || 2, line.length || 10, smooth(clamp(progress / .62, 0, 1)));
      const visibleLength = (line.length || 10) * lerp(.12, .5, 1 - progress);
      const tail = Math.max(line.start || 2, head - visibleLength);
      const alpha = Math.pow(Math.sin(progress * Math.PI), .72);
      ctx.globalAlpha = clamp(alpha * (line.alphaScale || 1), 0, 1);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width * lerp(1.15, .55, progress);
      ctx.lineCap = "round";
      ctx.beginPath();
      const startX = line.x + Math.cos(line.angle) * tail;
      const startY = line.y + Math.sin(line.angle) * tail;
      const endX = line.x + Math.cos(line.angle) * head;
      const endY = line.y + Math.sin(line.angle) * head;
      ctx.moveTo(startX, startY);
      if (line.curve) {
        const bow = line.curve * Math.sin(progress * Math.PI);
        const middleX = (startX + endX) * .5 - Math.sin(line.angle) * bow;
        const middleY = (startY + endY) * .5 + Math.cos(line.angle) * bow;
        ctx.quadraticCurveTo(middleX, middleY, endX, endY);
      } else {
        ctx.lineTo(endX, endY);
      }
      ctx.stroke();
    }
    for (const ring of impactRings) {
      if ((ring.layer || "front") !== layer) continue;
      const lifeRatio = clamp(ring.life / ring.maxLife, 0, 1);
      const progress = 1 - lifeRatio;
      ctx.save();
      ctx.translate(ring.x, ring.y);
      ctx.rotate(ring.angle || 0);
      ctx.scale(1, ring.squash || 1);
      if (ring.glow > 0 && progress < .62) {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, ring.radius * 1.12);
        glow.addColorStop(0, "rgba(255,255,255,.88)");
        glow.addColorStop(.24, ring.color);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = clamp(Math.pow(1 - progress / .62, 1.7) * ring.glow * (ring.alphaScale || 1), 0, 1);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, ring.radius * 1.12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = clamp(Math.pow(lifeRatio, 1.35) * .78 * (ring.alphaScale || 1), 0, 1);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width / Math.max(.25, ring.squash || 1);
      ctx.beginPath(); ctx.arc(0, 0, ring.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (const particle of particles) {
      if ((particle.layer || "front") !== layer) continue;
      ctx.globalAlpha = clamp(particle.life * 1.8 * (particle.alphaScale || 1), 0, 1);
      ctx.fillStyle = particle.color;
      if (particle.shape === "dust") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation || 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size * 2.2, particle.size * .65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (particle.shape === "chip") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation || 0);
        ctx.beginPath();
        ctx.moveTo(particle.size * 1.5, 0);
        ctx.lineTo(-particle.size, particle.size * .72);
        ctx.lineTo(-particle.size * .48, -particle.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (particle.shape === "slash") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation || 0);
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particle.size * 2.4;
        ctx.fillRect(-particle.size * 3.8, -particle.size * .24, particle.size * 7.6, particle.size * .48);
        ctx.restore();
      } else if (particle.shape === "orb") {
        const pulse = 1 + Math.sin((particle.age || 0) * particle.pulseRate + particle.phase) * .24;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = Math.max(.7, particle.size * .32);
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * 1.75 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha *= .55;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * .58, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (particle.shape === "comet") {
        const speed = Math.max(1, Math.hypot(particle.vx, particle.vy));
        const tail = particle.size * 3.2 + speed * .045;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = particle.color;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(.8, particle.size * .62);
        ctx.beginPath();
        ctx.moveTo(-particle.vx / speed * tail, -particle.vy / speed * tail);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * .7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (particle.shape === "diamond") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation || 0) + Math.PI * .25);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = Math.max(.7, particle.size * .28);
        const size = particle.size * 1.55;
        ctx.strokeRect(-size, -size, size * 2, size * 2);
        ctx.globalAlpha *= .32;
        ctx.fillRect(-size * .52, -size * .52, size * 1.04, size * 1.04);
        ctx.restore();
      } else if (particle.shape === "star") {
        const pulse = 1 + Math.sin((particle.age || 0) * particle.pulseRate + particle.phase) * .22;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation || 0);
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        for (let index = 0; index < 8; index++) {
          const angle = index / 8 * Math.PI * 2;
          const radius = (index % 2 ? particle.size * .32 : particle.size * 2.2) * pulse;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (index) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (particle.shape === "spark") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation || 0);
        const fadeStretch = lerp(.65, 1.5, clamp(particle.life / Math.max(.001, particle.maxLife || particle.life), 0, 1));
        ctx.fillRect(-particle.size * 1.7 * fadeStretch, -particle.size * .28, particle.size * 3.4 * fadeStretch, particle.size * .56);
        ctx.restore();
      } else {
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
    }
    if (layer === "front") for (const feedback of feedbacks) {
      const alpha = clamp(feedback.life / Math.min(.35, feedback.maxLife), 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = feedback.color;
      ctx.strokeStyle = matchMedia("(prefers-color-scheme: dark)").matches ? "#000" : "#fff";
      ctx.lineWidth = 3;
      ctx.font = `900 ${feedback.size}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.strokeText(feedback.text, feedback.x, feedback.y);
      ctx.fillText(feedback.text, feedback.x, feedback.y);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    const tick = Math.floor(performance.now() / 1000 * ANIMATION_FPS);
    const currentBat = impactFreeze > 0 && impactDisplayBat
      ? impactDisplayBat
      : (physicsBat || batPose());
    const heldBall = pitcherHeldBall();
    const returnBall = (phase === "return" || phase === "transfer") && ball
      ? { x: ball.x, y: ball.y, z: 0, depth: 0, r: ball.r, held: Boolean(ball.owner) }
      : null;
    const currentBall = heldBall || returnBall || (ball?.released ? { x: ball.x, y: ball.y, z: ball.z || 0, depth: ball.depth || 0, r: ball.r, held: false } : null);
    if (tick !== visualTick) {
      visualTick = tick;
      previousDisplayBat = displayBat || currentBat;
      previousDisplayBall = displayBall || currentBall;
    }
    displayBat = currentBat;
    displayBall = currentBall;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (shake > .1) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    applyImpactCamera();
    const field = scene();
    drawFielders();
    drawActor(field.pitcher.x, field.ground, "pitcher", field.actorScale * .96);
    drawActor(field.catcher.x, field.ground, "catcher", field.actorScale * 1.04);
    drawEffects("back");
    drawBatter(displayBat);
    drawBall(displayBall);
    drawEffects("front");
    drawHeavyHitStop();
    drawEdgeBlasts();
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(.04, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.desktopGame.onCursor((point) => {
    if (cursor.at) {
      const inputDt = Math.max(.008, (point.at - cursor.at) / 1000);
      cursor.rawVx = (point.x - cursor.rawX) / inputDt;
      cursor.rawVy = (point.y - cursor.rawY) / inputDt;
      cursor.rawSpeed = Math.hypot(cursor.rawVx, cursor.rawVy);
    } else {
      cursor.rawVx = 0;
      cursor.rawVy = 0;
      cursor.rawSpeed = 0;
    }
    cursor.rawX = point.x;
    cursor.rawY = point.y;
    cursor.targetX = clamp(point.x, 0, width);
    cursor.targetY = clamp(point.y, 0, height);
    cursor.at = point.at;
  });
  window.desktopGame.onPause((value) => {
    if (rankingOnlyOpen) rankingPreviousPaused = value;
    else paused = value;
  });
  window.desktopGame.onReset(resetGame);
  window.desktopGame.onPreviewHitEffects(previewHitEffects);
  window.desktopGame.onPreviewHomeRunEffects(previewHomeRunEffects);
  window.desktopGame.onShowRanking(showStandaloneRanking);
  window.desktopGame.onBounds((bounds) => {
    const wasInitial = pitchNumber === 0 && phase === "waiting";
    desktopLayout = {
      primaryX: Number.isFinite(bounds?.primaryX) ? bounds.primaryX : 0,
      primaryY: Number.isFinite(bounds?.primaryY) ? bounds.primaryY : 0,
      primaryWidth: Number.isFinite(bounds?.primaryWidth) ? bounds.primaryWidth : innerWidth,
      primaryHeight: Number.isFinite(bounds?.primaryHeight) ? bounds.primaryHeight : innerHeight,
      displays: Array.isArray(bounds?.displays) && bounds.displays.length
        ? bounds.displays
        : [{ id: "primary", primary: true, x: 0, y: 0, width: innerWidth, height: innerHeight, scaleFactor: 1 }]
    };
    if (Number.isFinite(bounds?.monitorCenterX)) neutralX = bounds.monitorCenterX;
    if (Number.isFinite(bounds?.monitorCenterY)) neutralY = bounds.monitorCenterY;
    resize();
    if (wasInitial) centerBatControl();
  });
  restartButton.addEventListener("click", handleResultButton);
  rankingForm.addEventListener("submit", submitRanking);
  addEventListener("resize", resize);

  resize();
  centerBatControl();
  window.desktopGame.ready();
  setTimeout(syncPersonalBestFromRanking, 1200);
  requestAnimationFrame(frame);
})();
