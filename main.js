"use strict";

const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, screen } = require("electron");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const path = require("path");
const rankingConfig = require("./ranking-config.json");
const bundledChangelog = require("./changelog.json");
const GameRules = require("./game-rules.js");

const APP_ID = "com.deskslugger.game";
const APP_ICON = path.join(__dirname, "icon.ico");
const TRAY_ICON = path.join(__dirname, "icon-tray.png");
const UPDATE_DOWNLOAD_TIMEOUT_MS = 180000;

app.setName("Desk Slugger");
app.setAppUserModelId(APP_ID);

let overlay;
let tray;
let cursorTimer;
let paused = false;
let quitting = false;
let resultInteractive = false;
let updateBusy = false;
let challengerBatPreview = false;

function primaryDesktopMetrics() {
  const primary = screen.getPrimaryDisplay();
  const workArea = { ...primary.workArea };
  return {
    workArea,
    primaryWorkArea: workArea,
    payload: {
      ...workArea,
      primaryX: 0,
      primaryY: 0,
      primaryWidth: workArea.width,
      primaryHeight: workArea.height,
      monitorCenterX: primary.bounds.x + primary.bounds.width / 2 - workArea.x,
      monitorCenterY: primary.bounds.y + primary.bounds.height / 2 - workArea.y,
      displays: [{ id: String(primary.id), primary: true, x: 0, y: 0, width: workArea.width, height: workArea.height, scaleFactor: primary.scaleFactor }]
    }
  };
}

function resultCardBounds() {
  const { primaryWorkArea: workArea } = primaryDesktopMetrics();
  const width = 304;
  const height = 420;
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  };
}

function createOverlay() {
  const metrics = primaryDesktopMetrics();
  const bounds = metrics.workArea;
  overlay = new BrowserWindow({
    ...bounds,
    title: "Desk Slugger",
    icon: APP_ICON,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: false,
    fullscreenable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.loadFile("index.html");
  overlay.once("ready-to-show", () => {
    overlay.showInactive();
    overlay.moveTop();
    overlay.setIgnoreMouseEvents(true, { forward: true });
  });

  overlay.webContents.on("did-finish-load", () => {
    overlay.webContents.send("desktop-bounds", metrics.payload);
    overlay.webContents.send("pause-state", paused);
    overlay.webContents.send("challenger-bat-preview", challengerBatPreview);
  });

  cursorTimer = setInterval(() => {
    if (!overlay || overlay.isDestroyed() || paused) return;
    const point = screen.getCursorScreenPoint();
    const currentBounds = overlay.getBounds();
    overlay.webContents.send("cursor", {
      x: point.x - currentBounds.x,
      y: point.y - currentBounds.y,
      at: Date.now()
    });
  }, 16);
}

function trayIcon() {
  const image = nativeImage.createFromPath(TRAY_ICON);
  return image.isEmpty() ? nativeImage.createFromPath(APP_ICON).resize({ width: 16, height: 16 }) : image.resize({ width: 16, height: 16 });
}

function rebuildTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "랭킹", click: showRanking },
    { label: "버전", click: showVersion },
    { label: updateBusy ? "업데이트 확인 중…" : "업데이트", enabled: !updateBusy, click: () => checkForUpdate() },
    {
      label: "챌린저 배트 체험",
      type: "checkbox",
      checked: challengerBatPreview,
      click: (menuItem) => {
        challengerBatPreview = Boolean(menuItem.checked);
        if (overlay && !overlay.isDestroyed()) {
          overlay.webContents.send("challenger-bat-preview", challengerBatPreview);
        }
      }
    },
    { label: "점수 이펙트 미리보기", click: previewHomeRunEffects },
    { type: "separator" },
    { label: "종료", click: quitGame }
  ]));
}

function compareVersions(left, right) {
  return GameRules.compareVersions(left, right);
}

function normalizedChangelog(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((entry) => {
    const version = String(entry?.version || "").trim();
    if (!/^\d+\.\d+\.\d+$/.test(version)) return [];
    const changes = Array.isArray(entry?.changes)
      ? entry.changes.map((change) => String(change).trim().slice(0, 120)).filter(Boolean).slice(0, 5)
      : [];
    return changes.length ? [{ version, changes }] : [];
  });
}

function changelogDetail(history, currentVersion, latestVersion = currentVersion) {
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0
    ? `최신 ${latestVersion} 사용 가능\n\n`
    : "";
  const entries = normalizedChangelog(history).slice(0, 6).map((entry) => {
    const current = entry.version === currentVersion ? "  ·  현재" : "";
    return `v${entry.version}${current}\n${entry.changes.map((change) => `• ${change}`).join("\n")}`;
  });
  return `${updateAvailable}${entries.join("\n\n") || "업데이트 내역이 없습니다."}`;
}

async function updateManifest() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${rankingConfig.serverUrl}/update`, {
      signal: controller.signal,
      headers: { "X-Desk-Slugger-League": rankingConfig.leagueKey }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `업데이트 서버 오류 (${response.status})`);
    if (!/^\d+\.\d+\.\d+$/.test(payload.version || "") || !/^[a-f0-9]{64}$/i.test(payload.sha256 || "")) {
      throw new Error("업데이트 정보가 올바르지 않습니다.");
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fileSha256(filePath) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function downloadUpdate(manifest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPDATE_DOWNLOAD_TIMEOUT_MS);
  const temporaryPath = path.join(app.getPath("temp"), `Desk-Slugger-${manifest.version}-${Date.now()}.exe`);
  try {
    const response = await fetch(`${rankingConfig.serverUrl}${manifest.downloadPath || "/update/download"}`, {
      signal: controller.signal,
      headers: { "X-Desk-Slugger-League": rankingConfig.leagueKey }
    });
    if (!response.ok || !response.body) throw new Error(`업데이트 다운로드 실패 (${response.status})`);
    await pipeline(
      Readable.fromWeb(response.body),
      fs.createWriteStream(temporaryPath, { flags: "wx" }),
      { signal: controller.signal }
    );
    const stat = await fs.promises.stat(temporaryPath);
    if (Number(manifest.size) > 0 && stat.size !== Number(manifest.size)) throw new Error("다운로드 크기가 일치하지 않습니다.");
    if ((await fileSha256(temporaryPath)).toLowerCase() !== manifest.sha256.toLowerCase()) throw new Error("업데이트 파일 검증에 실패했습니다.");
    return temporaryPath;
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
    if (error?.name === "AbortError") throw new Error("업데이트 다운로드 제한 시간(3분)을 초과했습니다.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function installDownloadedUpdate(downloadedPath) {
  const targetPath = process.env.PORTABLE_EXECUTABLE_FILE;
  if (!targetPath || !fs.existsSync(targetPath)) throw new Error("포터블 EXE에서만 자동 업데이트할 수 있습니다.");
  const helperPath = path.join(app.getPath("temp"), `desk-slugger-updater-${Date.now()}.ps1`);
  const resultPath = path.join(app.getPath("userData"), "update-result.json");
  await fs.promises.mkdir(path.dirname(resultPath), { recursive: true });
  await fs.promises.rm(resultPath, { force: true }).catch(() => {});
  const helper = `param([string]$TargetPath,[string]$UpdatePath,[int]$GameProcessId,[string]$ResultPath)\n`
    + `$ErrorActionPreference = 'Stop'\n`
    + `Wait-Process -Id $GameProcessId -ErrorAction SilentlyContinue\n`
    + `$BackupPath = "$TargetPath.backup"\n`
    + `$StagePath = "$TargetPath.update"\n`
    + `try {\n`
    + `  Remove-Item -LiteralPath $StagePath -Force -ErrorAction SilentlyContinue\n`
    + `  Copy-Item -LiteralPath $UpdatePath -Destination $StagePath -Force\n`
    + `  Remove-Item -LiteralPath $BackupPath -Force -ErrorAction SilentlyContinue\n`
    + `  Move-Item -LiteralPath $TargetPath -Destination $BackupPath -Force\n`
    + `  try {\n`
    + `    Move-Item -LiteralPath $StagePath -Destination $TargetPath -Force\n`
    + `    $process = Start-Process -FilePath $TargetPath -WorkingDirectory (Split-Path -LiteralPath $TargetPath) -WindowStyle Hidden -PassThru\n`
    + `    Start-Sleep -Milliseconds 1200\n`
    + `    if ($process.HasExited -and $process.ExitCode -ne 0) { throw "새 버전 실행 실패 (종료 코드 $($process.ExitCode))" }\n`
    + `    Remove-Item -LiteralPath $BackupPath -Force -ErrorAction SilentlyContinue\n`
    + `    Remove-Item -LiteralPath $ResultPath -Force -ErrorAction SilentlyContinue\n`
    + `  } catch {\n`
    + `    Remove-Item -LiteralPath $TargetPath -Force -ErrorAction SilentlyContinue\n`
    + `    if (Test-Path -LiteralPath $BackupPath) { Move-Item -LiteralPath $BackupPath -Destination $TargetPath -Force }\n`
    + `    throw\n`
    + `  }\n`
    + `} catch {\n`
    + `  if (-not (Test-Path -LiteralPath $TargetPath) -and (Test-Path -LiteralPath $BackupPath)) { Move-Item -LiteralPath $BackupPath -Destination $TargetPath -Force }\n`
    + `  @{ failed = $true; message = $_.Exception.Message; at = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $ResultPath -Encoding UTF8\n`
    + `  if (Test-Path -LiteralPath $TargetPath) { Start-Process -FilePath $TargetPath -WorkingDirectory (Split-Path -LiteralPath $TargetPath) -WindowStyle Hidden }\n`
    + `} finally {\n`
    + `  Remove-Item -LiteralPath $UpdatePath -Force -ErrorAction SilentlyContinue\n`
    + `  Remove-Item -LiteralPath $StagePath -Force -ErrorAction SilentlyContinue\n`
    + `  Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue\n`
    + `}\n`;
  await fs.promises.writeFile(helperPath, helper, "utf8");
  try {
    await new Promise((resolve, reject) => {
      const child = spawn("powershell.exe", [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", helperPath,
        targetPath, downloadedPath, String(process.pid), resultPath
      ], { detached: true, stdio: "ignore", windowsHide: true });
      child.once("spawn", () => { child.unref(); resolve(); });
      child.once("error", reject);
    });
  } catch (error) {
    await fs.promises.rm(helperPath, { force: true }).catch(() => {});
    throw error;
  }
  quitGame();
}

async function showPendingUpdateFailure() {
  const resultPath = path.join(app.getPath("userData"), "update-result.json");
  try {
    const raw = (await fs.promises.readFile(resultPath, "utf8")).replace(/^\uFEFF/, "");
    await fs.promises.rm(resultPath, { force: true });
    const result = JSON.parse(raw);
    if (!result?.failed) return;
    await dialog.showMessageBox({
      type: "warning",
      title: "업데이트 복구 완료",
      message: "새 버전 설치에 실패해 기존 버전으로 복구했습니다.",
      detail: String(result.message || "알 수 없는 설치 오류").slice(0, 500),
      buttons: ["확인"],
      noLink: true,
      icon: APP_ICON
    });
  } catch (error) {
    if (error?.code !== "ENOENT") await fs.promises.rm(resultPath, { force: true }).catch(() => {});
  }
}

async function checkForUpdate({ silentWhenCurrent = false, silentErrors = false } = {}) {
  if (updateBusy) return;
  updateBusy = true;
  rebuildTrayMenu();
  let downloadedPath = null;
  try {
    const manifest = await updateManifest();
    const currentVersion = app.getVersion();
    if (compareVersions(manifest.version, currentVersion) <= 0) {
      if (!silentWhenCurrent) await dialog.showMessageBox({ type: "info", title: "업데이트", message: "최신 버전입니다.", detail: `현재 버전 ${currentVersion}`, buttons: ["확인"], noLink: true, icon: APP_ICON });
      return;
    }
    const releaseNotes = normalizedChangelog(manifest.history)
      .filter((entry) => compareVersions(entry.version, currentVersion) > 0)
      .slice(0, 3);
    const choice = await dialog.showMessageBox({
      type: "info", title: "업데이트", message: "업데이트가 있습니다.",
      detail: `현재 ${currentVersion} → 최신 ${manifest.version}\n다운로드 후 게임이 자동으로 재시작됩니다.${releaseNotes.length ? `\n\n${changelogDetail(releaseNotes, currentVersion, currentVersion)}` : ""}`,
      buttons: ["받기", "나중에"], defaultId: 0, cancelId: 1, noLink: true, icon: APP_ICON
    });
    if (choice.response !== 0) return;
    tray.setToolTip(`Desk Slugger · ${manifest.version} 다운로드 중`);
    downloadedPath = await downloadUpdate(manifest);
    await installDownloadedUpdate(downloadedPath);
  } catch (error) {
    if (downloadedPath) await fs.promises.rm(downloadedPath, { force: true }).catch(() => {});
    if (!silentErrors) await dialog.showMessageBox({ type: "error", title: "업데이트 실패", message: "업데이트하지 못했습니다.", detail: error?.message || String(error), buttons: ["확인"], noLink: true, icon: APP_ICON });
  } finally {
    updateBusy = false;
    if (tray && !tray.isDestroyed()) tray.setToolTip("Desk Slugger");
    rebuildTrayMenu();
  }
}

function showRanking() {
  if (!overlay || overlay.isDestroyed()) return;
  if (!overlay.isVisible()) overlay.showInactive();
  overlay.webContents.send("show-ranking");
}

function previewHitEffects() {
  if (!overlay || overlay.isDestroyed()) return;
  if (!overlay.isVisible()) overlay.showInactive();
  overlay.webContents.send("preview-hit-effects");
}

function previewHomeRunEffects() {
  if (!overlay || overlay.isDestroyed()) return;
  if (!overlay.isVisible()) overlay.showInactive();
  overlay.webContents.send("preview-home-run-effects");
}

function previewPitcherCollision() {
  if (!overlay || overlay.isDestroyed()) return;
  if (!overlay.isVisible()) overlay.showInactive();
  overlay.webContents.send("preview-pitcher-collision");
}

async function showVersion() {
  const currentVersion = app.getVersion();
  let latestVersion = currentVersion;
  let history = bundledChangelog;
  try {
    const manifest = await updateManifest();
    latestVersion = manifest.version;
    const remoteHistory = normalizedChangelog(manifest.history);
    if (remoteHistory.length) history = remoteHistory;
  } catch {
    // Bundled history remains available when the LAN update server is offline.
  }
  await dialog.showMessageBox({
    type: "info",
    title: "버전",
    message: `Desk Slugger ${currentVersion}`,
    detail: changelogDetail(history, currentVersion, latestVersion),
    buttons: ["확인"],
    defaultId: 0,
    noLink: true,
    icon: APP_ICON
  });
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("Desk Slugger");
  tray.on("click", () => {
    if (!overlay) return;
    overlay.isVisible() ? overlay.hide() : overlay.showInactive();
    rebuildTrayMenu();
  });
  rebuildTrayMenu();
}

function quitGame() {
  if (quitting) return;
  quitting = true;
  clearInterval(cursorTimer);
  if (tray && !tray.isDestroyed()) tray.destroy();
  if (overlay && !overlay.isDestroyed()) overlay.destroy();
  app.exit(0);
}

function fitToDisplays() {
  if (!overlay || overlay.isDestroyed()) return;
  const metrics = primaryDesktopMetrics();
  overlay.setBounds(resultInteractive ? resultCardBounds() : metrics.workArea);
  if (!resultInteractive) overlay.webContents.send("desktop-bounds", metrics.payload);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

app.whenReady().then(() => {
  createOverlay();
  createTray();
  setTimeout(async () => {
    await showPendingUpdateFailure();
    setTimeout(() => checkForUpdate({ silentWhenCurrent: true, silentErrors: true }), 1800);
  }, 700);
  screen.on("display-added", fitToDisplays);
  screen.on("display-removed", fitToDisplays);
  screen.on("display-metrics-changed", fitToDisplays);
});

app.on("second-instance", () => {
  if (overlay && !overlay.isVisible()) overlay.showInactive();
});

app.on("window-all-closed", () => {
  if (quitting) app.exit(0);
});
app.on("will-quit", () => {
  clearInterval(cursorTimer);
});

ipcMain.on("renderer-ready", () => fitToDisplays());
ipcMain.handle("ranking-list", async () => rankingRequest("/ranking"));
ipcMain.handle("ranking-session", async () => rankingRequest("/session", { method: "POST", body: "{}" }));
ipcMain.handle("ranking-qualify", async (_event, rawScore) => {
  const score = Number(rawScore);
  if (!Number.isInteger(score) || score < 0 || score > 1000000 || score % 100 !== 0) throw new Error("유효하지 않은 점수입니다.");
  return rankingRequest(`/qualify?score=${encodeURIComponent(score)}`);
});
ipcMain.handle("ranking-submit", async (_event, payload) => {
  const nickname = String(payload?.nickname || "").trim();
  const score = Number(payload?.score);
  const sessionToken = String(payload?.sessionToken || "");
  if (!/^[\p{L}\p{N}_ -]{1,12}$/u.test(nickname)) throw new Error("닉네임은 1~12자로 입력해 주세요.");
  if (!Number.isInteger(score) || score < 0 || score > 1000000 || score % 100 !== 0) throw new Error("유효하지 않은 점수입니다.");
  if (!/^[a-f0-9]{48}$/i.test(sessionToken)) throw new Error("게임 인증 세션이 없습니다. 다시 플레이해 주세요.");
  try {
    return await rankingRequest("/scores", { method: "POST", body: JSON.stringify({ nickname, score, sessionToken }) });
  } catch (error) {
    if (error?.payload?.rank) return { ok: false, qualified: false, rank: error.payload.rank };
    throw error;
  }
});
ipcMain.on("set-interactive", (_event, interactive) => {
  if (!overlay || overlay.isDestroyed()) return;
  resultInteractive = interactive;
  if (interactive) {
    // Restrict click interception to the small result card instead of blocking
    // the entire transparent desktop overlay.
    overlay.setBounds(resultCardBounds());
    overlay.setIgnoreMouseEvents(false);
    overlay.setFocusable(true);
    overlay.show();
    overlay.focus();
  } else {
    const metrics = primaryDesktopMetrics();
    overlay.setIgnoreMouseEvents(true, { forward: true });
    overlay.setFocusable(false);
    overlay.setBounds(metrics.workArea);
    overlay.webContents.send("desktop-bounds", metrics.payload);
    overlay.showInactive();
  }
});

async function rankingRequest(endpoint, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`${rankingConfig.serverUrl}${endpoint}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Desk-Slugger-League": rankingConfig.leagueKey,
        "X-Desk-Slugger-Version": app.getVersion(),
        ...(init.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `랭킹 서버 오류 (${response.status})`);
      error.payload = payload;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("랭킹 서버 응답이 없습니다.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
