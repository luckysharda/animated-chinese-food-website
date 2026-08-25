# DEPLOY

Two supported targets. They are independent — you can use either or both.

| Target | What ships | Build |
|---|---|---|
| **Cloudflare Pages** | a directory of static files | `npm run build:static` → `out/` |
| **Docker / ghcr.io** | a Node server in a container | `npm run build` → `.next/standalone` |

Both routes of this site are prerendered (`○ Static` in the build output). There are
no API routes, no middleware, no server components that read request state — so the
static target loses nothing except `next/image` optimisation, which is why the images
in `/public` are authored at the sizes the layout actually uses.

---

## Cloudflare Pages

### Option A — connect the repo (no CI, no secrets)

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**,
pick `luckysharda/animated-chinese-food-website`, then set

```
Build command        npm run build:static
Build output dir     out
Node version         22
```

Cloudflare rebuilds on every push to `main` and gives you preview URLs per branch.
Nothing else to configure.

### Option B — deploy from GitHub Actions

`.github/workflows/pages.yml` builds and deploys on every push to `main`. It needs two
repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → Create → template **Cloudflare Pages — Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | right-hand sidebar of any Cloudflare dashboard page |

The workflow checks both are present and **fails immediately with a named error** if
either is missing, rather than half-deploying.

### Deploying by hand

```bash
npm run build:static
npx wrangler pages deploy        # reads wrangler.toml
```

**Wrangler requires Node ≥ 22.** This project builds fine on Node 20, so if `wrangler`
refuses to start that is why — switch Node for the deploy step, or use Option A/B and
let CI do it.

### Size

The last export was **564 files, 31MB**. Cloudflare Pages allows 20,000 files and 25MB
per file, so there is a lot of headroom; the CI job prints both numbers and fails if any
single file crosses the per-file limit.

---

## Docker

The repo is public, so the published image is **anonymously pullable** — no login, no PAT.

```bash
docker run -p 3000:3000 ghcr.io/luckysharda/animated-chinese-food-website:latest
# http://localhost:3000
```

Or build it yourself:

```bash
docker build -t umami-ramen .
docker run -p 3000:3000 umami-ramen
```

Or with compose, which also passes build args through:

```bash
docker compose up --build
```

### Tags

`.github/workflows/release.yml` pushes to ghcr.io on every push to `main` and on `v*`
tags, authenticating with the built-in `GITHUB_TOKEN` — there is no secret to configure.

| Tag | When |
|---|---|
| `latest` | every push to `main` |
| `main-<sha>` | every push to `main`, immutable |
| `v1.2.3`, `v1.2`, `v1` | when you push a `v1.2.3` tag |

Prefer the sha or a version tag in anything you actually run. `latest` moves.

---

## The one environment gotcha

`NEXT_PUBLIC_*` values are **inlined into the JavaScript at build time**, not read at
runtime. For the container that means:

```bash
docker run -e NEXT_PUBLIC_FLAG_OVERRIDES='{"webgl-climax":true}' ...   # does NOTHING
docker build --build-arg NEXT_PUBLIC_FLAG_OVERRIDES='{"webgl-climax":true}' ...   # works
```

This only affects build-time flag forcing. For everyday use you do not need it — flip a
flag in the browser console instead:

```js
__flags.set("webgl-climax", true)   // persists in localStorage, no rebuild
__flags.list()                      // every flag, its value, and which layer won
```

(`__flags` exists in development builds only.)

---

## Vercel instead

Import the repo; the defaults are correct and `output: "standalone"` is simply ignored —
Vercel does its own packaging. Do **not** set `BUILD_TARGET=static` there, or you lose
image optimisation for no benefit.

---

## Troubleshooting

**The images did not update after I replaced files in `/public`.**
`next/image` caches optimised variants under `.next/cache/images`, keyed by source URL
rather than file contents. Every asset script clears it as its last step; if you replaced
files by hand, `rm -rf .next/cache/images`.

**`wrangler` exits complaining about Node.** It needs ≥ 22. See above.

**The container starts but nothing answers on 3000.** The standalone server binds to
localhost unless `HOSTNAME=0.0.0.0` is set. The Dockerfile sets it; a hand-rolled run
command that overrides the environment may not.

**The static export is missing an image.** `out/` is built from `/public`, so confirm
the file exists there and is referenced through `src/data/assets.ts` — that manifest is
the only place asset paths live.
