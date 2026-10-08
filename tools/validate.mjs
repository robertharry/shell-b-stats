import { readFileSync } from "node:fs";
const root = new URL("../data/", import.meta.url);
const { matches } = JSON.parse(readFileSync(new URL("matches.json", root)));
const players = JSON.parse(readFileSync(new URL("players.json", root)));
const ORDER = ["G1&2","L1&2","G1&3","L1&3","G2&3","L2&3","M1","M2","M3"];
const validGame = ([a, b]) => {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi === 30) return lo === 29;
  if (hi === 21) return lo <= 19;
  return hi > 21 && hi < 30 && hi - lo === 2;
};
let bad = 0;
for (const m of matches) {
  const errs = [];
  [...m.lineup.ladies, ...m.lineup.gents].forEach(p => { if (!players[p]) errs.push(`unknown player ${p}`); });
  if (m.games.length !== 9) errs.push(`expected 9 fixtures, got ${m.games.length}`);
  let us = 0, them = 0;
  m.games.forEach((fx, i) => {
    if (fx.length !== 2) errs.push(`${ORDER[i]}: expected 2 games`);
    fx.forEach(g => { if (!validGame(g)) errs.push(`${ORDER[i]}: invalid score ${g}`); g[0] > g[1] ? us++ : them++; });
  });
  if (us !== m.reported.us || them !== m.reported.them)
    errs.push(`games won ${us}-${them} != reported ${m.reported.us}-${m.reported.them}`);
  console.log(`${m.id}: ${errs.length ? "FAIL" : "OK"} (${us}-${them})`);
  errs.forEach(e => console.log("   - " + e));
  m.flags?.forEach(f => console.log("   ? " + f));
  bad += errs.length;
}
process.exit(bad ? 1 : 0);
