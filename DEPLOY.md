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

## Putting it on your own domain

**Live origin: [https://www.ramenanimationapp.rocks](https://www.ramenanimationapp.rocks).**
www is canonical. The apex (`ramenanimationapp.rocks`) 301s onto it. Cloudflare Pages
(`umami-ramen.pages.dev`) is still the deploy target — the custom domain is a CNAME
in front of that project, not a second host.

The rest of this section is how that was attached. Substitute another domain for
`ramenanimationapp.rocks` if you ever move it.

### Read this first: the apex problem

A bare domain — `example.com`, no subdomain — **cannot hold a `CNAME` record**. The DNS
spec forbids it, because the apex must also carry `SOA` and `NS` records and a `CNAME` is
required to be the only record at its name. Cloudflare Pages is reached *by* CNAME.

Cloudflare works around this with **CNAME flattening**: it stores a CNAME at the apex and
answers queries with the resolved `A` records instead. That only works when **Cloudflare
is running your DNS**. Most registrars cannot do it at all — Route 53's `ALIAS` only points
at AWS resources, and GoDaddy and Namecheap have no apex equivalent.

So there are two honest options, and the first one is much better:

| | Apex works? | Effort |
|---|---|---|
| **A. Move nameservers to Cloudflare** | yes | ~10 min, then wait for propagation |
| **B. Keep DNS at your registrar** | no — `www` only | ~5 min |

### Option A — move nameservers to Cloudflare (recommended)

> **Before you start: this moves *all* DNS for the domain, not just the website.**
> If you receive email at this domain, its `MX` records — and the `TXT` records for SPF,
> DKIM and DMARC — must come across too, or **mail stops arriving**. Cloudflare's importer
> usually catches them, but it scans public DNS and can miss records. Check the imported
> list against your registrar's zone *before* you change the nameservers, and screenshot
> the old zone. This is the single most common way this procedure hurts.

1. **Cloudflare dashboard → Add a site.** Enter `example.com`, choose the **Free** plan.
2. Cloudflare scans your existing DNS and shows what it found. **Verify every record** —
   especially `MX` and any `TXT` starting `v=spf1` or `v=DMARC1`. Add anything missing by
   hand now.
3. Cloudflare shows you two nameservers, e.g. `ana.ns.cloudflare.com` and
   `bob.ns.cloudflare.com`.
4. **At your registrar**, replace the existing nameservers with those two. The setting is
   usually under "Nameservers", "DNS Management" or "Domain settings".
5. Wait. Cloudflare emails you when the zone goes **Active** — typically minutes, but the
   registrar's TTL can stretch it to 24–48h. Check with `dig +short NS example.com`.
6. Once Active: **Workers & Pages → umami-ramen → Custom domains → Set up a custom
   domain.** Enter `www.ramenanimationapp.rocks` first — that is the public hostname.
7. Add `ramenanimationapp.rocks` the same way, as a second custom domain. Cloudflare
   creates the flattened apex CNAME itself and replaces any leftover parking A.
8. TLS certificates issue automatically, usually inside a minute. Until they do you will
   briefly see a certificate warning — that is expected, not a misconfiguration.

**The apex → www redirect.** This site's public hostname is `www`. Adding the apex
as a second custom domain (step 7) would otherwise serve the same content on two
hostnames. Fix it with **Rules → Redirect Rules → Create rule** on the Free plan:

```
When    Hostname  equals  ramenanimationapp.rocks
Then    Dynamic redirect
        Expression   concat("https://www.ramenanimationapp.rocks", http.request.uri.path)
        Status       301
        Preserve query string   on
```

### Option B — keep DNS at your registrar

Only `www` can work. Do not fight the apex; you will lose.

1. **Workers & Pages → umami-ramen → Custom domains → Set up a custom domain**, enter
   `www.example.com`. Cloudflare tells you the record it wants.
2. At your registrar, create it:

   ```
   Type    CNAME
   Name    www
   Value   umami-ramen.pages.dev
   TTL     automatic / 300
   ```
3. For the apex, use whatever forwarding your registrar offers — most have a "domain
   forwarding" or "redirect" feature. Point `example.com` → `https://www.example.com`,
   permanent (301). Quality varies; some registrars break HTTPS on the apex entirely.

### Verifying it, from a terminal

```bash
dig +short NS ramenanimationapp.rocks           # Option A: should be *.ns.cloudflare.com
dig +short ramenanimationapp.rocks              # should resolve to Cloudflare IPs
dig +short www.ramenanimationapp.rocks          # CNAME chain ending at pages.dev
curl -sI https://www.ramenanimationapp.rocks | head -3
curl -sI https://ramenanimationapp.rocks | head -3   # expect 301 to www

# the real test — is it actually serving this build?
curl -s https://www.ramenanimationapp.rocks/hero/sequence/frame_0075.jpg -o /tmp/live.jpg
cmp /tmp/live.jpg public/hero/sequence/frame_0075.jpg && echo "byte-identical"
```

### The one repo change

`src/app/layout.tsx` needs `metadataBase` set to the live origin. Without it Next resolves
Open Graph and Twitter image URLs **relative**, so link previews break wherever the site is
shared. It is one line, and it is the only code that has to know the domain:

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://www.ramenanimationapp.rocks"),
  // …
};
```

### What does *not* change

Nothing about the pipeline. A custom domain is a routing decision made on Cloudflare's
side, in front of the deployment. `pages.yml`, `wrangler.toml` and the build are all
untouched, every previous deployment keeps its immutable `*.pages.dev` URL, and rollback
still works exactly as before.

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
