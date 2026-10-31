# Scrap Trap — landing site

A dependency-free, English-only landing site for **Scrap Trap**, the hidden-trap mobile platformer. The production target is <https://pitfall.lamnv.com/>.

### Public submission pages

| Purpose | URL |
| --- | --- |
| Support / issue forms | <https://pitfall.lamnv.com/support/> |
| Privacy notice | <https://pitfall.lamnv.com/privacy/> |
| Changelog | <https://pitfall.lamnv.com/changelog/> |

The store section is intentionally informational: Google Play and Apple App Store are both **coming soon**, with no fabricated download links, dates, prices, ratings, or testimonials.

## Run locally

No build step is required. From this directory:

```bash
python3 -m http.server 8000
# open http://127.0.0.1:8000/
node scripts/validate.mjs
```

The validator checks all four HTML documents, local links/assets, English-only metadata, canonical URLs, JSON-LD, issue-form templates, the social-card dimensions, sitemap, robots, and the GitHub links. There are no runtime dependencies or third-party trackers.

## App-store follow-up

These support, privacy and changelog URLs are website routes prepared for store submission; linking them from the shipped app and its store listings is a separate integration step outside this static-site batch. Before release, sync the in-app privacy link and Google Play / Apple App Store privacy labels with the current game policy and shipped dependencies. This site is not a full legal, SDK or store-review audit and does not guarantee approval.

## Deployment

`.github/workflows/pages.yml` validates the site and deploys only the public HTML, styles, scripts, assets, and crawler files with GitHub Actions Pages on pushes to `main` (and manual dispatch). The repository Pages setting must use **GitHub Actions** as its source. The workflow grants Pages write and OIDC identity-token permissions, uses the `pages` concurrency group, and publishes the staged `_site` artifact.

If the repository owner, repository name, or canonical host changes, update all of these together:

- `<link rel="canonical">`, Open Graph URLs, JSON-LD URLs and image URLs in every HTML page
- `sitemap.xml`, `robots.txt`, `llms.txt`, this README, and the workflow/Pages setting if needed
- the social-card URL and any absolute links in validation expectations

`robots.txt` is served at the root of pitfall.lamnv.com, so it is the domain-root robots policy for the site.

## Content provenance

The game facts are transcribed from the companion Flutter source’s [`ios` release branch](https://github.com/nguyenvanlamm/scrap-trap/tree/ios): level data and design notes (`lib/engine/levels.dart`), tuning, traps, progress, sound and purchase code. Those sources establish the 20 levels, 15 trap and mechanism types, battery economy, Scan/EMP costs and ranges, checkpoint memory, power-core alarm, crusher escape, ranks against par, and the free levels 1–3 / one-time unlock model. The `master` branch is an older, diverged line of development and is not the source for this site. The maintainer confirmed planned Google Play and Apple App Store availability; neither listing is live yet. The hero artwork and social card are original site illustrations; the caption explicitly identifies the hero as an illustration, not a gameplay screenshot.

Development source: <https://github.com/nguyenvanlamm/scrap-trap>. Ownership, store links, release wording, or canonical URLs should only be changed when verified by the project owner. Replace the two non-link store status labels with real store URLs only after each listing is public and verified.

## Small future experiments

Keep any A/B work factual and reversible. Possible experiments are (A) the current editorial hero versus a shorter mechanic-first hero, or (B) a single CTA versus the current Explore + release-status pairing. Do not add analytics, cookies, fake proof, or unverified launch claims just to measure a variant.
