#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://pitfall.lamnv.com/';
const issueForms = {
  bug: 'https://github.com/nguyenvanlamm/scrap-trap-site/issues/new?template=bug_report.yml',
  feature: 'https://github.com/nguyenvanlamm/scrap-trap-site/issues/new?template=feature_request.yml',
  feedback: 'https://github.com/nguyenvanlamm/scrap-trap-site/issues/new?template=feedback.yml',
};
const pages = [
  { file: 'index.html', canonical: base, type: 'VideoGame', mustContain: ['The factory', 'Scan the illustration'], faqCount: 5 },
  { file: 'support/index.html', canonical: `${base}support/`, type: 'WebPage', mustContain: ['Report a bug', 'Suggest a feature', 'Send feedback'], issueForms: true },
  { file: 'privacy/index.html', canonical: `${base}privacy/`, type: 'WebPage', mustContain: ['Current development build', 'Stored by the app', 'In-app purchase', 'Restore purchase'], },
  { file: 'changelog/index.html', canonical: `${base}changelog/`, type: 'WebPage', mustContain: ['1.0.0', 'In development / unreleased'], },
];
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const read = (file) => readFileSync(join(root, file), 'utf8');

function localTarget(pageFile, reference) {
  const pageUrl = new URL(`${base}${pageFile}`);
  const url = new URL(reference, pageUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.origin !== new URL(base).origin) return null;
  const path = url.pathname.replace(/^\//, '');
  const clean = path || 'index.html';
  if (clean.endsWith('/')) return join(root, clean, 'index.html');
  return join(root, clean);
}

function localReferences(pageFile, html) {
  const found = [];
  const pattern = /<(?:a|area|link|script|img|source)\b[^>]+(?:href|src)=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    const ref = match[1];
    if (ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('data:') || ref.startsWith('javascript:')) continue;
    const target = localTarget(pageFile, ref);
    if (target) found.push({ ref, target });
  }
  return found;
}

function checkFragments(pageFile, html) {
  const pattern = /href=["']([^"']*#([^"']+))["']/gi;
  for (const match of html.matchAll(pattern)) {
    const target = localTarget(pageFile, match[1]);
    if (!target || !existsSync(target)) continue;
    const targetHtml = readFileSync(target, 'utf8');
    check(new RegExp(`(?:id|name)=["']${match[2]}["']`).test(targetHtml), `${pageFile}: missing fragment target #${match[2]}`);
  }
}

for (const page of pages) {
  const html = read(page.file);
  check(/<html\s+lang=["']en["']/i.test(html), `${page.file}: html lang must be en`);
  check(html.includes(`<link rel="canonical" href="${page.canonical}">`), `${page.file}: canonical URL is missing or wrong`);
  check(!/hreflang=|og:locale:alternate|lang=["']vi["']|href=["'][^"']*\bvi\//i.test(html), `${page.file}: site is English-only; remove alternate-language links`);
  check(/<title>[^<]+<\/title>/.test(html), `${page.file}: title is missing`);
  check(html.includes(`<meta name="description" content="`), `${page.file}: meta description is missing`);
  check(html.includes(`<meta property="og:url" content="${page.canonical}">`), `${page.file}: Open Graph URL must match canonical`);
  check(html.includes(`<meta property="og:image" content="${base}assets/social-card.png">`), `${page.file}: absolute social image is missing`);
  check(html.includes(`<meta name="twitter:image" content="${base}assets/social-card.png">`), `${page.file}: twitter image is missing`);
  const references = localReferences(page.file, html);
  for (const route of ['support', 'privacy', 'changelog']) {
    const expected = join(root, route, 'index.html');
    check(references.some(({ target }) => target === expected), `${page.file}: missing ${route} navigation`);
  }
  const brandHref = html.match(/<a class="brand" href="([^"]+)"/)?.[1];
  check(brandHref && localTarget(page.file, brandHref) === join(root, 'index.html'), `${page.file}: brand must link to home`);
  check(html.includes('class="footer-links"'), `${page.file}: footer links are missing`);
  for (const marker of page.mustContain) check(html.includes(marker), `${page.file}: expected content marker missing: ${marker}`);
  if (page.faqCount !== undefined) check((html.match(/<details\b/g) ?? []).length === page.faqCount, `${page.file}: landing FAQ must contain exactly five questions`);
  if (page.issueForms) {
    for (const url of Object.values(issueForms)) check(html.includes(url), `${page.file}: issue form link missing: ${url}`);
    check(!/<form\b/i.test(html), `${page.file}: support page must not add a fake on-page form`);
  }

  const jsonScripts = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  check(jsonScripts.length === 1, `${page.file}: expected one JSON-LD script`);
  if (jsonScripts.length === 1) {
    try {
      const data = JSON.parse(jsonScripts[0][1]);
      const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
      const primary = nodes.find((node) => node['@type'] === page.type);
      check(primary, `${page.file}: JSON-LD must include ${page.type}`);
      if (primary) {
        check(primary.url === page.canonical, `${page.file}: JSON-LD URL must match canonical`);
        if (page.type === 'VideoGame') {
          check(Array.isArray(primary.gamePlatform) && primary.gamePlatform.includes('Android') && primary.gamePlatform.includes('iOS'), `${page.file}: JSON-LD planned platforms must include Android and iOS`);
        } else {
          check(primary.inLanguage === 'en', `${page.file}: WebPage JSON-LD language must be en`);
        }
      }
      for (const node of nodes) {
        check(!('offers' in node) && !('aggregateRating' in node) && !('review' in node), `${page.file}: JSON-LD must not invent offers, ratings, or reviews`);
      }
      if (page.faqCount !== undefined) {
        const faq = nodes.find((node) => node['@type'] === 'FAQPage');
        check(faq && Array.isArray(faq.mainEntity) && faq.mainEntity.length === page.faqCount, `${page.file}: FAQPage JSON-LD must list exactly ${page.faqCount} questions`);
        if (faq && Array.isArray(faq.mainEntity)) {
          const summaries = [...html.matchAll(/<summary><span>([^<]+)<\/span>/g)].map((match) => match[1]);
          faq.mainEntity.forEach((entity, index) => {
            check(entity.name === summaries[index], `${page.file}: FAQPage question ${index + 1} does not match the visible summary`);
          });
        }
      }
    } catch (error) {
      errors.push(`${page.file}: JSON-LD is not valid JSON (${error.message})`);
    }
  }

  for (const { ref, target } of localReferences(page.file, html)) check(existsSync(target), `${page.file}: broken local reference ${ref}`);
  checkFragments(page.file, html);
}

const socialCard = join(root, 'assets/social-card.png');
check(existsSync(socialCard), 'assets/social-card.png is missing');
if (existsSync(socialCard)) {
  const png = readFileSync(socialCard);
  check(png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'assets/social-card.png is not a PNG');
  if (png.length >= 24) check(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, 'assets/social-card.png must be 1200x630');
}

for (const file of ['bug_report.yml', 'feature_request.yml', 'feedback.yml']) {
  const template = join(root, '.github/ISSUE_TEMPLATE', file);
  check(existsSync(template), `.github/ISSUE_TEMPLATE/${file} is missing`);
  if (existsSync(template)) {
    const yaml = readFileSync(template, 'utf8');
    check(/^name:\s*.+/m.test(yaml), `${file}: name is missing`);
    check(/^description:\s*.+/m.test(yaml), `${file}: description is missing`);
    check(/^title:\s*.+/m.test(yaml), `${file}: title is missing`);
    check(/^body:\s*$/m.test(yaml), `${file}: body is missing`);
    check(!/^labels:/m.test(yaml), `${file}: do not reference unverified labels`);
    check(!/[À-ỹ]/.test(yaml), `${file}: issue templates are English-only`);
  }
}
const issueConfig = read('.github/ISSUE_TEMPLATE/config.yml');
check(/^blank_issues_enabled:\s*false\s*$/m.test(issueConfig), 'issue template config must disable blank issues');

const sitemap = read('sitemap.xml');
for (const page of pages) check(sitemap.includes(`<loc>${page.canonical}</loc>`), `sitemap.xml is missing ${page.canonical}`);
check((sitemap.match(/<loc>/g) ?? []).length === pages.length, `sitemap.xml must contain exactly ${pages.length} routes`);
check(!sitemap.includes('hreflang'), 'sitemap.xml must not list alternate-language routes');
const robots = read('robots.txt');
check(robots.includes(`Sitemap: ${base}sitemap.xml`), 'robots.txt must point to sitemap.xml');
const llms = read('llms.txt');
for (const page of pages) check(llms.includes(page.canonical), `llms.txt is missing ${page.canonical}`);
check(llms.includes('not a guarantee of AI ranking'), 'llms.txt must state its factual, non-ranking purpose');
const readme = read('README.md');
for (const route of ['support/', 'privacy/', 'changelog/']) check(readme.includes(`${base}${route}`), `README is missing ${route} submission URL`);
check(readme.includes('privacy labels'), 'README must document store-privacy follow-up');
check(readme.includes('domain-root robots policy'), 'README must document robots scope');

if (errors.length) {
  console.error(`Static validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Static validation passed: ${pages.length} pages, metadata/JSON-LD, local links/anchors, issue templates, sitemap/robots, and social card.`);
