import { readFileSync, readdirSync, statSync } from "node:fs";
const root = new URL("../data/", import.meta.url);
const validGame = ([a, b]) => {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi === 30) return lo === 29;
  if (hi === 21) return lo <= 19;
  return hi > 21 && hi < 30 && hi - lo === 2;
};
let bad = 0;
for (const dir of readdirSync(root).filter(d => statSync(new URL(d + "/", root)).isDirectory())) {
  const read = f => JSON.parse(readFileSync(new URL(`${dir}/${f}`, root)));
  const { matches } = read("matches.json"), players = read("players.json");
  console.log(`[${dir}]`);
  for (const m of matches) {
    const errs = [];
    Object.values(m.lineup).flat().forEach(p => { if (!players[p]) errs.push(`unknown player ${p}`); });
    if (m.games.length !== 9) errs.push(`expected 9 fixtures, got ${m.games.length}`);
    let us = 0, them = 0;
    m.games.forEach((fx, i) => {
      if (fx.length !== 2) errs.push(`fixture ${i + 1}: expected 2 games`);
      fx.forEach(g => { if (!validGame(g)) errs.push(`fixture ${i + 1}: invalid score ${g}`); g[0] > g[1] ? us++ : them++; });
    });
    if (us !== m.reported.us || them !== m.reported.them)
      errs.push(`games won ${us}-${them} != reported ${m.reported.us}-${m.reported.them}`);
    console.log(`  ${m.id}: ${errs.length ? "FAIL" : "OK"} (${us}-${them})`);
    errs.forEach(e => console.log("     - " + e));
    bad += errs.length;
  }
}
process.exit(bad ? 1 : 0);
