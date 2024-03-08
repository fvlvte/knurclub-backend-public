export function deepEqualHelper(a: unknown, b: unknown) {
  if (typeof a !== typeof b) return false;
  if (typeof a === "number" || typeof b === "string") {
    return a === b;
  } else if (typeof a === "object") {
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!deepEqualHelper(a[i], b[i])) return false;
      }
      return true;
    } else {
      if (a === null && b === null) return true;
      if (a) {
        if (!b) return false;
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);

        if (aKeys.length !== bKeys.length) return false;

        for (const key of aKeys) {
          if (
            !deepEqualHelper(
              (a as Record<string, unknown>)[key],
              (b as Record<string, unknown>)[key],
            )
          )
            return false;
        }
        return true;
      }
    }
  } else if (typeof a === "undefined") {
    return typeof b === "undefined";
  } else if (typeof a === "string") {
    return a === b;
  } else if (typeof a === "boolean") {
    return a === b;
  } else {
    throw new Error("Unsupported equality check:" + typeof a);
  }
}
