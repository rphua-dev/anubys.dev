import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PRIMARY = ["Product", "How it works", "Scenarios", "Results", "Docs", "About"];

const REDIRECTS = {
  "method/index.html": ["how-it-works/index.html", "method"],
  "gate/index.html": ["how-it-works/index.html", "gate"],
  "performance/index.html": ["results/index.html", "performance"],
  "use-cases/index.html": ["scenarios/index.html", "use-cases"],
  "integrations/index.html": ["about/index.html", "integrations"],
  "docs/roadmap/index.html": ["about/index.html", "roadmap"],
  "docs/changelog/index.html": ["about/index.html", "changelog"],
};

function htmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "test") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function primaryLabels(html) {
  const start = html.indexOf('aria-label="Primary"');
  const nav = html.slice(start, html.indexOf("</nav>", start));
  return [...nav.matchAll(/>([^<]+)<\/a>/g)].map((match) => match[1]);
}

test("primary nav is six items in order on every page", () => {
  const files = htmlFiles(root);
  assert.ok(files.length >= 24);
  for (const file of files) {
    const labels = primaryLabels(fs.readFileSync(file, "utf8"));
    assert.deepEqual(labels, PRIMARY, path.relative(root, file));
  }
});

test("merged sections and the reserved metrics anchor are present", () => {
  const how = read("how-it-works/index.html");
  assert.match(how, /id="how-root"/);
  assert.match(how, /id="method"/);
  assert.match(how, /id="gate"/);
  assert.match(how, /id="exit-codes"/);
  assert.match(how, /id="pending-aa"/);
  assert.match(how, /id="stats-title"/);
  assert.match(how, /Bad input/);
  assert.match(how, /pending real A\/A and Block results/);
  const scenarios = read("scenarios/index.html");
  assert.match(scenarios, /id="scenarios-root"/);
  assert.match(scenarios, /id="use-cases"/);
  const results = read("results/index.html");
  assert.match(results, /id="results"/);
  assert.match(results, /id="performance"/);
  assert.match(results, /id="metrics"/);
  assert.match(results, /id="timing-root"/);
  const about = read("about/index.html");
  assert.match(about, /id="roadmap"/);
  assert.match(about, /id="changelog"/);
  assert.match(about, /id="integrations"/);
  assert.match(about, /GitHub Action is planned for v0\.2/);
  assert.match(about, /id="support"/);
  assert.match(about, /https:\/\/paypal\.me\/ryanphua17/);
  const docs = read("docs/index.html");
  assert.match(docs, /Getting started/);
  assert.match(docs, /Install/);
  assert.match(docs, /Quickstart/);
  assert.match(docs, /Concepts/);
  assert.match(docs, /Writing scenarios/);
  assert.match(docs, /results\.json/);
  assert.doesNotMatch(docs, /dns-setup/);
  const dns = read("docs/dns-setup/index.html");
  assert.match(dns, /name="robots" content="noindex"/);
  assert.match(dns, /https:\/\/github\.com\/rphua-dev\/anubys\.dev/);
  assert.doesNotMatch(dns, /ryean0\/anubys/);
});

test("old urls redirect to an existing target and anchor", () => {
  for (const [rel, [target, hash]] of Object.entries(REDIRECTS)) {
    const html = read(rel);
    const dest = read(target);
    assert.match(html, new RegExp(`http-equiv="refresh"[^>]*url=[^"]*#${hash}`), rel);
    assert.match(html, new RegExp(`rel="canonical" href="https://anubys\\.dev/[^"]*#${hash}"`), rel);
    assert.match(html, /location\.replace/, rel);
    assert.match(html, /<a href="[^"]+">/, rel);
    assert.match(dest, new RegExp(`id="${hash}"`), `${rel} -> ${target}#${hash}`);
  }
});

test("legacy anchors still resolve on the page or its redirect target", () => {
  const legacy = JSON.parse(read("test/fixtures/legacy-anchors.json"));
  for (const [rel, ids] of Object.entries(legacy)) {
    const target = REDIRECTS[rel]?.[0] || rel;
    const html = read(target);
    for (const id of ids) {
      assert.match(html, new RegExp(`id="${id}"`), `${rel}#${id} -> ${target}`);
    }
  }
});

test("internal links resolve and the sitemap omits dns setup", () => {
  const sitemap = read("sitemap.xml");
  assert.doesNotMatch(sitemap, /dns-setup/);
  assert.doesNotMatch(sitemap, /ryean0\/anubys/);
  assert.match(sitemap, /https:\/\/anubys\.dev\/how-it-works\//);
  for (const file of htmlFiles(root)) {
    const html = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(html, /ryean0\/anubys/, path.relative(root, file));
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const href = match[1];
      if (/^(https?:|mailto:|#)/i.test(href)) continue;
      const clean = href.split("#")[0].split("?")[0];
      if (!clean) continue;
      const abs = path.resolve(path.dirname(file), clean);
      const index = fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? path.join(abs, "index.html") : abs;
      assert.equal(fs.existsSync(index), true, `${path.relative(root, file)} -> ${href}`);
    }
  }
});
