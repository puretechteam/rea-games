# Pitfalls

Mistakes already made in this repository, each with the rule that prevents it. Add one in the same change whenever a
mistake is worth not repeating.

**A fixture with wrong tile positions made the original misbehave.** 2048 moves tiles by their own `x`/`y`, not by their
place in the grid, so a saved game built with every `position.x = 0` produced a trace no sane port could match. Build
fixtures so every field agrees with the cell it sits in, and look at a few steps of each hand-made case.

**A stale snapshot was recorded as truth.** 2048's `keepPlaying` never calls the actuator, so the last actuated state
still said "terminated" and the port correctly said it was not. Read state from the live game object, not from the
last callback.

**Comparing JSON as text failed a correct Rust port.** `serde_json` sorts keys, JavaScript keeps insertion order, and every
case "differed". Compare parsed values (`lib/compare.mjs`), never `JSON.stringify` output.

**`in` found keys the port never printed.** `firstDiff` checked `k in a`, which is true for inherited names, so a port
that printed a `constructor` key was reported as `.constructor: undefined != 1` instead of a missing key. Check own keys
with `Object.hasOwn`; `test/compare.test.mjs` covers it.

**One failing build hid every other result.** The exception from a port's build ended `verify all`, so on a machine
without cargo nothing after `2048 / bevy` was checked and there was no summary. A port that cannot run is that port's
failure (`verifyGames` in `lib/verify.mjs`); the run goes on and ends with one line per port.
**CI never reached `verify all`.** The Godot checksum line turned `<hash>  Godot_v...zip` into `<hash>   godot.zip`
(three spaces), so `sha512sum -c` looked for a file named ` godot.zip` and every run failed before any port was replayed.
Replace only the file name in the sums line, and look at a new workflow's log for the `verify` output, not just its
colour.

**A check that cannot fail looks like a pass.** After a port is green, break it three ways (a constant, a branch, an
offset) and watch `verify` fail each time; otherwise the cases may not reach the code you think they do.
