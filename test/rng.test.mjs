import { test } from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../lib/rng.mjs";

// The recorders seed their games with mulberry32, so a change to it changes every recording.
const first = (seed, n) => {
  const next = mulberry32(seed);
  return Array.from({ length: n }, () => next());
};

test("mulberry32(1) starts with the same values", () => {
  assert.deepEqual(first(1, 4), [0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741]);
});

test("mulberry32(20481) starts with the same values", () => {
  assert.deepEqual(first(20481, 4), [0.7898392309434712, 0.22376155178062618, 0.21108766249381006, 0.954076440539211]);
});

test("the same seed gives the same sequence, and values stay in [0, 1)", () => {
  assert.deepEqual(first(7, 50), first(7, 50));
  for (const v of first(7, 1000)) assert.ok(v >= 0 && v < 1, `${v}`);
});
