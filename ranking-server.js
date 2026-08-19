"use strict";

const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
let config = {};
try {
  config = require("./ranking-config.json");
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const PORT = Number(process.env.PORT || 47831);
const HOST = "0.0.0.0";
const LEAGUE_KEY = process.env.LEAGUE_KEY || config.leagueKey;
if (!LEAGUE_KEY) throw new Error("LEAGUE_KEY is required");
const dataDirectory = process.env.DATA_DIRECTORY || path.join(__dirname, "ranking-data");
const updateDirectory = process.env.UPDATE_DIRECTORY || path.join(__dirname, "updates");
fs.mkdirSync(dataDirectory, { recursive: true });
const database = new DatabaseSync(path.join(dataDirectory, "desk-slugger.db"));
const recentRequests = new Map();

database.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    score INTEGER NOT NULL,
    client_ip TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS scores_rank_idx ON scores(score DESC, created_at ASC);
`);

const insertScore = database.prepare("INSERT INTO scores (nickname, score, client_ip) VALUES (?, ?, ?)");
const topScores = database.prepare("SELECT id, nickname, score, created_at AS savedAt FROM scores ORDER BY score DESC, created_at ASC LIMIT ?");
const prospectiveRank = database.prepare("SELECT COUNT(*) + 1 AS rank FROM scores WHERE score >= ?");

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function body(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 4096) request.destroy();
    });
    request.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}

function updateInfo() {
  const manifestPath = path.join(updateDirectory, "manifest.json");
  const executablePath = path.join(updateDirectory, "Desk-Slugger-latest.exe");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const stat = fs.statSync(executablePath);
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version || "") || !/^[a-f0-9]{64}$/i.test(manifest.sha256 || "")) throw new Error("invalid manifest");
  if (Number(manifest.size) !== stat.size) throw new Error("update size mismatch");
  return { manifest, executablePath, stat };
}

const server = http.createServer(async (request, response) => {
  const ip = request.socket.remoteAddress || "unknown";
  if (request.headers["x-desk-slugger-league"] !== LEAGUE_KEY) return json(response, 401, { error: "invalid league" });

  if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true });
  if (request.method === "GET" && request.url === "/update") {
    try {
      const { manifest } = updateInfo();
      return json(response, 200, { ...manifest, downloadPath: "/update/download" });
    } catch {
      return json(response, 503, { error: "update unavailable" });
    }
  }
  if (request.method === "GET" && request.url === "/update/download") {
    try {
      const { manifest, executablePath, stat } = updateInfo();
      response.writeHead(200, {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Length": stat.size,
        "Content-Disposition": `attachment; filename=Desk-Slugger-${manifest.version}.exe`,
        "Cache-Control": "no-store"
      });
      fs.createReadStream(executablePath).pipe(response);
      return;
    } catch {
      return json(response, 503, { error: "update unavailable" });
    }
  }
  if (request.method === "GET" && request.url?.startsWith("/ranking")) {
    return json(response, 200, { ranking: topScores.all(50) });
  }
  if (request.method === "GET" && request.url?.startsWith("/qualify")) {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const score = Number(url.searchParams.get("score"));
    if (!Number.isInteger(score) || score < 0 || score > 1000000 || score % 100 !== 0) return json(response, 400, { error: "invalid score" });
    const rank = Number(prospectiveRank.get(score).rank);
    return json(response, 200, { qualified: rank <= 10, rank });
  }
  if (request.method === "POST" && request.url === "/scores") {
    const now = Date.now();
    if (now - (recentRequests.get(ip) || 0) < 2000) return json(response, 429, { error: "too fast" });
    recentRequests.set(ip, now);
    try {
      const payload = await body(request);
      const nickname = String(payload.nickname || "").trim();
      const score = Number(payload.score);
      if (!/^[\p{L}\p{N}_ -]{1,12}$/u.test(nickname)) return json(response, 400, { error: "invalid nickname" });
      if (!Number.isInteger(score) || score < 0 || score > 1000000 || score % 100 !== 0) return json(response, 400, { error: "invalid score" });
      const rank = Number(prospectiveRank.get(score).rank);
      if (rank > 10) return json(response, 409, { error: "not top 10", qualified: false, rank });
      const inserted = insertScore.run(nickname, score, ip);
      return json(response, 201, { ok: true, qualified: true, rank, entryId: Number(inserted.lastInsertRowid), ranking: topScores.all(10) });
    } catch {
      return json(response, 400, { error: "invalid request" });
    }
  }
  return json(response, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Desk Slugger ranking server listening on ${HOST}:${PORT}`);
  console.log(`Database: ${path.join(dataDirectory, "desk-slugger.db")}`);
  console.log(`Updates: ${updateDirectory}`);
});
