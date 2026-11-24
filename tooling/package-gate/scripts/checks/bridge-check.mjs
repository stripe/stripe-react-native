/**
 * Checks that every bridge contract inventory entry in the package's
 * families is pinned by a fixture and none is pending. `families` is a list
 * of family names, or "*" for all of them.
 */
export function checkFamilies({ inventory, fixtures, families }) {
  const known = [...new Set(Object.values(inventory).map((e) => e.family))];
  const wanted = families === '*' ? known : families;
  const errors = [];
  for (const family of wanted) {
    if (!known.includes(family)) {
      errors.push(`family "${family}" is not used in inventory.json`);
    }
  }
  const pinned = new Set();
  for (const { method, keys } of fixtures) {
    pinned.add(method);
    if (keys.some((key) => key === 'result' || key.startsWith('result.'))) {
      pinned.add(`${method}#result`);
    }
  }
  const fixtureCountByFamily = new Map();
  for (const fixture of fixtures) {
    fixtureCountByFamily.set(
      fixture.family,
      (fixtureCountByFamily.get(fixture.family) ?? 0) + 1
    );
  }
  const summary = [];
  for (const family of wanted.filter((f) => known.includes(f))) {
    const ids = Object.keys(inventory).filter(
      (id) => inventory[id].family === family
    );
    const count = fixtureCountByFamily.get(family) ?? 0;
    for (const id of ids) {
      if (inventory[id].pending) {
        errors.push(`${id} is still pending: ${inventory[id].pending}`);
      } else if (!pinned.has(id)) {
        errors.push(`${id} has no fixture`);
      }
    }
    summary.push({ family, entries: ids.length, fixtures: count });
  }
  return { errors, summary };
}

export function familyIndex(parsed) {
  const fixtures = [];
  for (const item of parsed.fixtures) {
    if (!item.fixture) continue;
    const expect = item.fixture.expect ?? {};
    fixtures.push({
      family: item.family,
      method: item.fixture.method,
      keys: [
        ...Object.keys(expect.shared ?? {}),
        ...Object.keys(expect.ios ?? {}),
        ...Object.keys(expect.android ?? {}),
      ],
    });
  }
  return { inventory: parsed.inventory, fixtures };
}
