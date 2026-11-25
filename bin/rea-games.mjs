#!/usr/bin/env node
// rea-games: record a game's original, check a port against the recording.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { listGames, loadGame, verifyGames, summaryLines, packCases } from "../lib/verify.mjs";
import { scaffold } from "../lib/scaffold.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n) => { const i = rest.indexOf(n); return i < 0 ? null : rest.splice(i, 2)[1] ?? true; };

const help = `rea-games: reverse-engineer a game's behavior, then check a rebuild against it

  rea-games list                        games, their ports and recorded cases
  rea-games new <game>                  scaffold games/<game> (game.json, record.mjs, GAME.md, port stub)
  rea-games record <game>               run the original and write cases/*.json
  rea-games pack <game|all>             gzip the cases (the repository keeps them packed)
  rea-games verify <game|all> [--port web|rust|...]   replay every case through a port
`;

async function main() {
  if (!cmd || cmd === "help" || cmd === "--help") return console.log(help);
  if (cmd === "list") {
    for (const g of listGames(root)) {
      const { meta } = loadGame(root, g);
      console.log(`${g.padEnd(12)} original: ${meta.original.repo} (${meta.original.license})  ports: ${Object.keys(meta.ports).join(", ")}`);
    }
    return;
  }
  if (cmd === "new") {
    console.log("created", scaffold(root, rest[0] ?? ""));
    return;
  }
  if (cmd === "record") {
    const g = rest[0];
    const { dir, meta } = loadGame(root, g);
    const cd = path.join(dir, "cases");
    if (fs.existsSync(cd)) for (const f of fs.readdirSync(cd)) if (f.endsWith(".json.gz")) fs.rmSync(path.join(cd, f)); // packed copies would go stale
    const mod = await import(pathToFileURL(path.join(dir, meta.record)).href);
    console.log(`recorded ${g}:`, await mod.record());
    return;
  }
  if (cmd === "pack") {
    for (const g of rest[0] === "all" || !rest[0] ? listGames(root) : [rest[0]]) {
      const r = packCases(root, g);
      console.log(`${g}: ${(r.before / 1e6).toFixed(1)} MB -> ${(r.after / 1e6).toFixed(1)} MB`);
    }
    return;
  }
  if (cmd === "verify") {
    const portOpt = flag("--port");
    const names = rest[0] === "all" || !rest[0] ? listGames(root) : [rest[0]];
    const results = verifyGames(root, names, portOpt && portOpt !== true ? portOpt : null);
    if (results.length > 1) console.log(["", "summary", ...summaryLines(results).map((l) => "  " + l)].join("\n"));
    process.exit(results.some((r) => r.error || r.failures.length) ? 1 : 0);
  }
  console.error(help);
  process.exit(2);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
