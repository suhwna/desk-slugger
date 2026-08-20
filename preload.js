"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopGame", {
  onCursor: (callback) => ipcRenderer.on("cursor", (_event, point) => callback(point)),
  onPause: (callback) => ipcRenderer.on("pause-state", (_event, paused) => callback(paused)),
  onReset: (callback) => ipcRenderer.on("reset-game", () => callback()),
  onPreviewHitEffects: (callback) => ipcRenderer.on("preview-hit-effects", () => callback()),
  onPreviewHomeRunEffects: (callback) => ipcRenderer.on("preview-home-run-effects", () => callback()),
  onPreviewPitcherCollision: (callback) => ipcRenderer.on("preview-pitcher-collision", () => callback()),
  onChallengerBatPreview: (callback) => ipcRenderer.on("challenger-bat-preview", (_event, enabled) => callback(Boolean(enabled))),
  onShowRanking: (callback) => ipcRenderer.on("show-ranking", () => callback()),
  onBounds: (callback) => ipcRenderer.on("desktop-bounds", (_event, bounds) => callback(bounds)),
  rankingList: () => ipcRenderer.invoke("ranking-list"),
  startRankingSession: () => ipcRenderer.invoke("ranking-session"),
  rankingQualify: (score) => ipcRenderer.invoke("ranking-qualify", score),
  submitScore: (nickname, score, sessionToken) => ipcRenderer.invoke("ranking-submit", { nickname, score, sessionToken }),
  setInteractive: (interactive) => ipcRenderer.send("set-interactive", Boolean(interactive)),
  ready: () => ipcRenderer.send("renderer-ready")
});
