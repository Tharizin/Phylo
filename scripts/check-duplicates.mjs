import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      return [key, value];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function norm(value) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, " ");
}

const { data, error } = await supabase
  .from("species")
  .select("id, common_name, latin_name, alternative_names")
  .order("common_name");

if (error) {
  console.error("ERR", error.message);
  process.exit(1);
}

console.log("Total species:", data.length);

const byCommon = new Map();
const byLatin = new Map();

for (const row of data) {
  const commonKey = norm(row.common_name);
  if (!byCommon.has(commonKey)) byCommon.set(commonKey, []);
  byCommon.get(commonKey).push(row);

  if (row.latin_name) {
    const latinKey = norm(row.latin_name);
    if (!byLatin.has(latinKey)) byLatin.set(latinKey, []);
    byLatin.get(latinKey).push(row);
  }
}

const commonDups = [...byCommon.entries()].filter(([, rows]) => rows.length > 1);
const latinDups = [...byLatin.entries()].filter(([, rows]) => rows.length > 1);

console.log("Duplicate common names:", commonDups.length);
for (const [, rows] of commonDups) {
  console.log(" ", rows.map((r) => `${r.common_name} | ${r.latin_name}`).join(" ; "));
}

console.log("Duplicate latin names:", latinDups.length);
for (const [key, rows] of latinDups.slice(0, 30)) {
  console.log(" ", key, ":", rows.map((r) => r.common_name).join(", "));
}

let aliasIssues = 0;
for (const row of data) {
  const seen = new Set();
  const dups = [];
  for (const alias of row.alternative_names ?? []) {
    const key = norm(alias);
    if (seen.has(key)) dups.push(alias);
    seen.add(key);
  }
  if (dups.length) {
    aliasIssues += 1;
    console.log("Alias dups", `${row.common_name}:`, dups.join(", "));
  }
}

console.log("Species with duplicate aliases:", aliasIssues);
