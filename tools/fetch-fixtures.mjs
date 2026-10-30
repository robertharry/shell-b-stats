// Usage: node tools/fetch-fixtures.mjs <division-results-url> "<team>" "<division>" <outfile>
// Reads a league division results page, keeps one team's fixtures, drops "Rearranged" duplicates.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const plain = s => s.replace(/<[^>]+>/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const txt = s => plain(s.replace(/<a[\s\S]*?<\/a>/gi, " ")) || plain(s);

export function parse(html, team) {
  const out = [];
  for (const r of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const c = [...r[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x => x[1]);
    if (c.length < 4) continue;
    const d = plain(c[0]).match(/^(\d\d)\/(\d\d)\/(\d{4})$/);
    if (!d) continue;
    const home = txt(c[1]), away = txt(c[2]), res = plain(c[3].replace(/<a[\s\S]*?<\/a>/gi, " "));
    if (home !== team && away !== team) continue;
    if (/^rearranged$/i.test(res)) continue;
    const isHome = home === team, m = res.match(/(\d+)\s*-\s*(\d+)/);
    const map = (c[1].match(/href="([^"]+)"/) || [])[1];
    const x = { date: `${d[3]}-${d[2]}-${d[1]}`, home: isHome, opponent: isHome ? away : home };
    if (!isHome && map) x.map = map;
    if (m) x.result = isHome ? { us: +m[1], them: +m[2] } : { us: +m[2], them: +m[1] };
    else if (res) x.status = res;
    out.push(x);
  }
  if (!out.length) throw new Error(`No fixtures found for ${team}; page layout may have changed`);
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [url, team, division, outFile] = process.argv.slice(2);
  const res = await fetch(url, { headers: { "user-agent": "shell-stats (team stats site)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const fixtures = parse(await res.text(), team);
  writeFileSync(outFile, JSON.stringify({ season: "2026-27", division, source: url, fixtures }, null, 2));
  console.log(`${fixtures.length} fixtures written`);
}
