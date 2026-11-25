import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { verifyGames, summaryLines } from "../lib/verify.mjs";

// A port that answers every case with the recorded trace.
const ECHO_PORT = `let s = "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  const c = JSON.parse(s);
  process.stdout.write(JSON.stringify({ trace: c.trace, tapeUsed: c.tape.length }));
});
`;

// games/<name> with one case and the given ports; every port runs ECHO_PORT unless it says otherwise.
function makeRoot(games) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rea-games-verify-"));
  for (const [name, ports] of Object.entries(games)) {
    const dir = path.join(root, "games", name);
    fs.mkdirSync(path.join(dir, "cases"), { recursive: true });
    fs.writeFileSync(path.join(dir, "port.mjs"), ECHO_PORT);
    fs.writeFileSync(path.join(dir, "cases", "one.json"), JSON.stringify({ inputs: [0, 1], tape: [0.5], trace: [{ s: 0 }, { s: 1 }] }));
    const meta = { name, original: { repo: "test/test", license: "MIT" }, ports: {} };
    for (const [port, extra] of Object.entries(ports)) meta.ports[port] = { cmd: ["node", "port.mjs"], ...extra };
    fs.writeFileSync(path.join(dir, "game.json"), JSON.stringify(meta));
  }
  return root;
}

const quiet = () => {};
const BROKEN_BUILD = { build: ["node", "-e", "process.exit(1)"] };

test("a failing build is that port's failure, and the other ports and games still run", () => {
  const root = makeRoot({ a: { web: {}, broken: BROKEN_BUILD, last: {} }, b: { web: {} } });
  try {
    const results = verifyGames(root, ["a", "b"], null, quiet);
    assert.deepEqual(results.map((r) => `${r.name}/${r.port}`), ["a/web", "a/broken", "a/last", "b/web"]);
    const broken = results.find((r) => r.port === "broken");
    assert.match(broken.error, /build of a\/broken failed/);
    for (const r of results.filter((r) => r !== broken)) assert.deepEqual([r.error, r.passed, r.cases], [undefined, 1, 1]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an unknown port is reported for that game, not thrown", () => {
  const root = makeRoot({ a: { web: {} }, b: { web: {} } });
  try {
    const results = verifyGames(root, ["a", "b"], "nope", quiet);
    assert.equal(results.length, 2);
    for (const r of results) assert.match(r.error, /has no port "nope" \(has: web\)/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the log names the failure as it happens and ends with one line per port", () => {
  const wrong = { cmd: ["node", "-e", "process.stdout.write(JSON.stringify({ trace: [], tapeUsed: 0 }))"] };
  const root = makeRoot({ a: { web: {}, broken: BROKEN_BUILD, wrong } });
  try {
    const lines = [];
    const results = verifyGames(root, ["a"], null, (l) => lines.push(l));
    assert.ok(lines.includes("  FAIL build of a/broken failed"), lines.join("\n"));
    assert.deepEqual(summaryLines(results), [
      "a / web     => 1/1 cases identical, 2 inputs, 2 recorded states",
      "a / broken  => FAIL build of a/broken failed",
      "a / wrong   => FAIL 0/1 cases identical, 0 inputs, 0 recorded states",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
