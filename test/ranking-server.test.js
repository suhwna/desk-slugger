"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("ranking server start timeout")), 5000);
    child.once("error", reject);
    child.stdout.on("data", (chunk) => {
      if (!String(chunk).includes("listening")) return;
      clearTimeout(timeout);
      resolve();
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`ranking server exited early (${code})`));
    });
  });
}

test("ranking submission requires one server-issued, plausible game session", { timeout: 12000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "desk-slugger-test-"));
  const port = await availablePort();
  const leagueKey = "test-league-key-with-sufficient-length";
  const child = spawn(process.execPath, [path.join(__dirname, "..", "ranking-server.js")], {
    env: { ...process.env, PORT: String(port), LEAGUE_KEY: leagueKey, DATA_DIRECTORY: directory, UPDATE_DIRECTORY: directory },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const headers = { "Content-Type": "application/json", "X-Desk-Slugger-League": leagueKey, "X-Desk-Slugger-Version": "test" };
  const request = (route, body) => fetch(`http://127.0.0.1:${port}${route}`, {
    method: "POST", headers, body: JSON.stringify(body || {})
  });

  try {
    await waitForServer(child);
    const sessionResponse = await request("/session");
    assert.equal(sessionResponse.status, 201);
    const { sessionToken } = await sessionResponse.json();
    assert.match(sessionToken, /^[a-f0-9]{48}$/);

    const premature = await request("/scores", { nickname: "tester", score: 100, sessionToken });
    assert.equal(premature.status, 422);

    await new Promise((resolve) => setTimeout(resolve, 3050));
    const accepted = await request("/scores", { nickname: "tester", score: 100, sessionToken });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).ok, true);

    const retry = await request("/scores", { nickname: "tester", score: 100, sessionToken });
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).ok, true);

    const replay = await request("/scores", { nickname: "tester", score: 200, sessionToken });
    assert.equal(replay.status, 409);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
