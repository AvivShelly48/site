import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];
const htmlFiles = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (extname(entry.name) === ".html") htmlFiles.push(path);
  }
}

function fail(file, message) {
  failures.push(`${relative(root, file)}: ${message}`);
}

walk(root);

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  if (/\bSAMPLE\b|sample fallback|נתוני המלאי להמחשה/i.test(html)) {
    fail(file, "contains demo/sample inventory logic");
  }
  if (/\[שנה\]/.test(html)) fail(file, "contains a visible year placeholder");
  if (/href=["']#["']/.test(html)) fail(file, "contains an empty hash link");

  for (const match of html.matchAll(/(?:href|src)=["']([^"'#]+)["']/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(target)) continue;
    const clean = decodeURIComponent(target.split("?")[0]);
    const absolute = resolve(dirname(file), clean);
    if (!existsSync(absolute)) fail(file, `broken local reference: ${target}`);
  }

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); }
    catch (error) { fail(file, `invalid JSON-LD: ${error.message}`); }
  }
}

const projectFiles = htmlFiles.filter((file) => relative(root, file).split(/[\\/]/)[0] === "projects");
for (const file of projectFiles) {
  const html = readFileSync(file, "utf8");
  for (const required of [
    /<title>[^<]+<\/title>/,
    /<meta name="description"/,
    /<link rel="canonical"/,
    /<meta property="og:title"/,
    /<meta property="og:description"/,
    /<meta property="og:image"/,
    /<meta name="twitter:card"/,
    /<meta name="twitter:title"/,
    /<meta name="twitter:description"/,
    /<meta name="twitter:image"/,
    /"@type":"BreadcrumbList"/
  ]) {
    if (!required.test(html)) fail(file, `missing required SEO marker: ${required}`);
  }
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
for (const file of projectFiles) {
  const url = `https://shellygroup.co.il/${relative(root, file).replaceAll("\\", "/")}`;
  if (!sitemap.includes(url)) fail(file, "missing from sitemap.xml");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Verified ${htmlFiles.length} HTML files, ${projectFiles.length} project pages, local links, JSON-LD, metadata, and sitemap coverage.`);
