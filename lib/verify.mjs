// Runs a port over every recorded case and compares its trace with the original's.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { firstDiff } from "./compare.mjs";

export function loadGame(root, name) {
  const dir = path.join(root, "games", name);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "game.json"), "utf8"));
  return { dir, meta };
}

export function listGames(root) {
  return fs.readdirSync(path.join(root, "games")).filter((n) => fs.existsSync(path.join(root, "games", n, "game.json"))).sort();
}

export function loadCases(dir) {
  const cd = path.join(dir, "cases");
  // cases are stored as .json, or as .json.gz once packed (`rea-games pack`) to keep the repository small
  return fs.readdirSync(cd).filter((f) => f.endsWith(".json") || f.endsWith(".json.gz")).sort().map((f) => {
    const buf = fs.readFileSync(path.join(cd, f));
    return { file: f.replace(/\.gz$/, ""), raw: (f.endsWith(".gz") ? zlib.gunzipSync(buf) : buf).toString("utf8") };
  });
}

export function verifyPort(root, name, portName, log = console.log) {
  const { dir, meta } = loadGame(root, name);
  const port = meta.ports[portName];
  if (!port) throw new Error(`${name} has no port "${portName}" (has: ${Object.keys(meta.ports).join(", ")})`);
  if (port.build) {
    const b = spawnSync(port.build[0], port.build.slice(1), { cwd: dir, stdio: ["ignore", "inherit", "inherit"] });
    if (b.status !== 0) throw new Error(`build of ${name}/${portName} failed`);
  }
  const cases = loadCases(dir);
  let passed = 0, inputs = 0, frames = 0;
  const failures = [];
  for (const { file, raw } of cases) {
    const c = JSON.parse(raw);
    // `godot` means the binary in $REA_GODOT when set, so a download outside PATH works
    const exe = port.cmd[0] === "godot" && process.env.REA_GODOT ? process.env.REA_GODOT : port.cmd[0];
    const r = spawnSync(exe, port.cmd.slice(1), { cwd: dir, input: raw, maxBuffer: 1 << 29, encoding: "utf8", timeout: 120000 }); // a hung port fails the case, not the run
    let problem = null;
    if (r.error?.code === "ETIMEDOUT") problem = "port did not finish within 120 s";
    else if (r.status !== 0) problem = `port exited ${r.status}: ${(r.stderr || "").trim().split("\n").slice(-2).join(" | ")}`;
    else {
      let out;
      // engines print a banner before the program's output: the result is the one line that starts with "{"
      const line = r.stdout.split("\n").find((l) => l.startsWith("{")) ?? r.stdout;
      try { out = JSON.parse(line); } catch { problem = "port printed something that is not JSON"; }
      if (!problem) {
        const d = firstDiff(c.trace, out.trace);
        if (d) problem = `trace differs at ${d}`;
        else if (out.tapeUsed !== c.tape.length) problem = `used ${out.tapeUsed} of the ${c.tape.length} recorded random numbers`;
      }
    }
    if (problem) { failures.push({ file, problem }); log(`  FAIL ${file}: ${problem}`); }
    else { passed++; inputs += c.inputs.length; frames += c.trace.length; log(`  ok   ${file}  (${c.inputs.length} inputs)`); }
  }
  return { name, port: portName, cases: cases.length, passed, inputs, frames, failures };
}

// Verifies every port of each game (or only `portName`), one after the other. A port that cannot
// run (its build fails, or the game has no such port) is that port's failure, with the reason in
// `error`; the next port and game still run.
export function verifyGames(root, names, portName, log = console.log) {
  const results = [];
  for (const g of names) {
    const { meta } = loadGame(root, g);
    for (const p of portName ? [portName] : Object.keys(meta.ports)) {
      log(`${g} / ${p}`);
      let r;
      try {
        r = verifyPort(root, g, p, log);
        log(`  => ${r.passed}/${r.cases} cases identical, ${r.inputs} inputs, ${r.frames} recorded states`);
      } catch (e) {
        r = { name: g, port: p, cases: 0, passed: 0, inputs: 0, frames: 0, failures: [], error: e.message };
        log(`  FAIL ${e.message}`);
      }
      results.push(r);
    }
  }
  return results;
}

// One line per game and port, for the end of a run; a port that failed starts with FAIL.
export function summaryLines(results) {
  const labels = results.map((r) => `${r.name} / ${r.port}`);
  const width = Math.max(0, ...labels.map((l) => l.length)) + 2;
  return results.map((r, i) => {
    const counts = `${r.passed}/${r.cases} cases identical, ${r.inputs} inputs, ${r.frames} recorded states`;
    return `${labels[i].padEnd(width)}=> ${r.error ? `FAIL ${r.error}` : r.failures.length ? `FAIL ${counts}` : counts}`;
  });
}

export function packCases(root, name) {
  const { dir } = loadGame(root, name);
  const cd = path.join(dir, "cases");
  let before = 0, after = 0;
  for (const f of fs.readdirSync(cd).filter((x) => x.endsWith(".json"))) {
    const buf = fs.readFileSync(path.join(cd, f));
    const gz = zlib.gzipSync(buf, { level: 9 });
    fs.writeFileSync(path.join(cd, f + ".gz"), gz);
    fs.unlinkSync(path.join(cd, f));
    before += buf.length; after += gz.length;
  }
  return { before, after };
}
