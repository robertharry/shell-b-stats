// Usage: node tools/fetch-league.mjs <tables-url> <outfile>
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const txt = s => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const num = s => Number(s) || 0;

export function parse(html) {
  const divisions = {};
  for (const t of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const rows = [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)]
      .map(r => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => txt(c[1])));
    if (rows.length < 2) continue;
    divisions[rows[0][0]] = rows.slice(1).filter(r => r.length >= 5)
      .map(([team, p, w, l, avg]) => ({ team, p: num(p), w: num(w), l: num(l), avg: num(avg) }));
  }
  if (!divisions["Division 1"]?.length) throw new Error("Division 1 table not found; page layout may have changed");
  return divisions;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const res = await fetch(process.argv[2], { headers: { "user-agent": "shell-b-stats (team stats site)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const divisions = parse(await res.text());
  writeFileSync(process.argv[3],
    JSON.stringify({ updated: new Date().toISOString(), source: process.argv[2], divisions }, null, 2));
  console.log("league table written");
}
