# Contributing to rea-games

The most useful contribution is **a new game that passes its own recording**, or **a new engine port of an existing one**.

## Add a game

1. Pick a game whose source you may run and redistribute (MIT, BSD, Apache, public domain). Say which licence in the issue first. No commercial games, no trademarked names, no art or sound from the original.
2. `node bin/rea-games.mjs new <game>` and read `skills/rea-games/SKILL.md`: it is the whole workflow.
3. Vendor the original unmodified under `originals/<game>` with its licence, and add a line to `NOTICE`.
4. Record it (`record.mjs`), write `GAME.md`, write the port, and make `node bin/rea-games.mjs verify <game>` print every case identical.
5. Break the port on purpose in at least three ways and show `verify` fails each time (put the numbers in the PR).
6. `node bin/rea-games.mjs pack <game>` before committing; cases are stored gzipped.

## Add an engine port

A port is any program that reads a case on stdin and prints `{trace, tapeUsed}` (see `games/2048/ports/godot/runner.gd` and `games/2048/ports/rust/src/main.rs`). Add it to the game's `game.json`. It counts as verified only when `verify` passes it.

## Rules

- `npm test` runs the unit tests in `test/` (Node only, a few seconds); run it after changing anything in `lib/`.
  `npm run verify` replays every case through every port.
- Never edit a recording by hand, and never loosen a comparison to get green.
- Report numbers as `verify` printed them, including what is not covered.
- Add a mistake worth not repeating to `docs/pitfalls.md` in the same change.
