import { test } from "node:test";
import assert from "node:assert/strict";
import { firstDiff } from "../lib/compare.mjs";

test("equal values have no difference", () => {
  assert.equal(firstDiff(3, 3), null);
  assert.equal(firstDiff("a", "a"), null);
  assert.equal(firstDiff(null, null), null);
  assert.equal(firstDiff([1, [2, { s: 3 }]], [1, [2, { s: 3 }]]), null);
});

test("key order is ignored", () => {
  assert.equal(firstDiff({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }), null);
});

test("arrays of different lengths", () => {
  assert.equal(firstDiff([1, 2, 3], [1, 2]), ": length 3 != 2");
  assert.equal(firstDiff({ trace: [] }, { trace: [{}] }), ".trace: length 0 != 1");
});

test("the message names the nested path", () => {
  const board = (v) => ({ board: [[0, 0], [0, 0], [0, v]] });
  assert.equal(firstDiff(board(2), board(4)), ".board[2][1]: 2 != 4");
});

test("-0 and 0, and NaN and NaN, are equal", () => {
  assert.equal(firstDiff(-0, 0), null);
  assert.equal(firstDiff(NaN, NaN), null);
  assert.equal(firstDiff({ x: [-0] }, { x: [0] }), null);
});

test("null against an object", () => {
  assert.equal(firstDiff(null, {}), ": null != {}");
  assert.equal(firstDiff({ s: {} }, { s: null }), ".s: {} != null");
});

test("a key missing on either side", () => {
  assert.equal(firstDiff({ a: 1 }, {}), ".a: missing in port");
  assert.equal(firstDiff({}, { a: 1 }), ".a: missing in expected");
});

test("keys named like Object.prototype members are not inherited ones", () => {
  assert.equal(firstDiff({}, { constructor: 1 }), ".constructor: missing in expected");
  assert.equal(firstDiff({ toString: 1 }, {}), ".toString: missing in port");
  assert.equal(firstDiff({ constructor: 1 }, { constructor: 1 }), null);
});
