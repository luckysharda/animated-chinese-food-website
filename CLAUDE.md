# CLAUDE.md

Guidance for Claude Code in this repository.

The working agreement — commands, stack, architecture, the rules that are not
negotiable, and the traps that have already cost time — lives in `AGENTS.md` and is
imported here so the two can never drift:

@AGENTS.md

Everything below is specific to running Claude Code against this repo.

---

## Read these before changing anything

- `DESIGN.md` — the design system, reconstructed from frame analysis. The colour
  metering rules and the typographic devices are in here, not in the CSS comments.
- `README.md` — what the site is, what is real about the assets, and the payload
  numbers each environment actually fetches.
- `DEPLOY.md` — Cloudflare Pages and Docker/ghcr.io targets.

## Verifying work

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Run those three before reporting a change as done — `npm run build` is the only one
that catches a broken static export, and `tsc` fails in seconds where the build takes
minutes. None of them can see a hero that stutters, so anything touching the scrub
also wants `npm run dev` and a look at `http://localhost:3000` on a real wheel.

The `run` skill will launch the dev server; prefer it over inventing a command.

## Working in this repo

- **Do not run the asset pipelines speculatively.** `npm run hero`,
  `npm run place-images` and `npm run assets` overwrite committed output in `/public`.
  Run one only when regenerating is the actual task, and check `git status` after.
- **Search before adding.** There is very likely already a primitive in
  `src/components/ui/` or a hook in `src/hooks/` for what you are about to write.
- **Copy changes go in `src/data/content.ts`.** If you are editing a string inside a
  `.tsx` file, you are almost certainly in the wrong file.
- **Match the comment density.** This codebase documents *why*, with the measurement
  that justifies the number. A patch with no comments reads as foreign here; so does
  one whose comments assert something nobody measured.
- **Numbers travel in groups.** The hero's card windows, cut points, block fade and
  reduced-motion progress are one system across `content.ts`, `HeroCaptionDeck.tsx`
  and `Hero.tsx`. Change one and check the other three.

## Git

`main` is the deploy branch and CI runs on it. Work on `develop` or a topic branch.
Commit when asked; do not push to `main`.

## System prompt

`.claude/system-prompt.md` holds a longer operating brief for a session focused on
this site's scroll choreography. To use it:

```bash
claude --append-system-prompt "$(cat .claude/system-prompt.md)"
```
