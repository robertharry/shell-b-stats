// Usage: node tools/fetch-league.mjs [outfile]   (default data/league.json)
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const URL_ = "https://stockport-badminton.co.uk/tables/All";
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
  const res = await fetch(URL_, { headers: { "user-agent": "shell-b-stats (team stats site)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const divisions = parse(await res.text());
  writeFileSync(process.argv[2] ?? "data/league.json",
    JSON.stringify({ updated: new Date().toISOString(), source: URL_, divisions }, null, 2));
  console.log("league table written");
}
