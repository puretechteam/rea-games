// Deep comparison that ignores object key order and reports the first difference.
export function firstDiff(a, b, at = "") {
  if (a === b) return null;
  if (typeof a === "number" && typeof b === "number") {
    return Object.is(a, b) || a === b ? null : `${at}: ${a} != ${b}`;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${at}: length ${a.length} != ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${at}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of [...keys].sort()) {
      if (!Object.hasOwn(a, k)) return `${at}.${k}: missing in expected`;
      if (!Object.hasOwn(b, k)) return `${at}.${k}: missing in port`;
      const d = firstDiff(a[k], b[k], `${at}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return `${at}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
}
