# 0332. Every model call for a project is paid with that project's own key, kept sealed

**Status:** Accepted
**Date:** 2026-11-01
**Section:** §5 (portal), the reasoning plane

## Context

0329 has Loom call a model for every project's pages, every day. Until now the
portal's one model was built at module scope from `LOOM_ANTHROPIC_API_KEY`, the
deployment's own key. The maintainer, on 1 November 2026:

> *"Loom anthropic key is already set on Vercel...but users need the ability to
> use their own key. I don't want everyone using mine for free."*

The plan already puts *model credentials* in the reasoning plane
(`docs/portal.md`, *Planes*), owned per project.

## Decision

1. **A project's model calls are paid with the project's own Anthropic key, and
   nothing else.** An owner sets it on the project's *Settings*. A project
   without one has nothing proposed for it: the deployment's key is never used
   in its place, and neither is any other project's. The portal no longer reads
   `LOOM_ANTHROPIC_API_KEY` at all.

2. **The key is sealed at rest.** It is encrypted with AES-256-GCM under a key
   derived with HKDF from the portal's session secret, which every deployment
   that signs anybody in already holds, under its own label so the two uses
   share no bytes. A copy of the table without the deployment's environment is
   noise.

3. **It is shown once, as it is typed, and never again.** Settings names a set
   key by its last four characters and when it was set, and offers to replace
   or remove it. The box is a password field that always starts empty.

4. **Only an owner sets, replaces or removes it**, like everything else that
   costs money or changes credentials (`docs/portal.md`, *Roles*). Every member
   is told whether one is set.

5. **A key sealed under a secret the deployment no longer has is said, not
   guessed at.** Settings and the page screen say it can no longer be read and
   has to be set again.

## Alternatives considered

- **Store it readable, as 0298 does the project key.** That key can only add
  readers to a project and is in every page anyway. A model key is a bill
  somebody else pays and works anywhere, so a leaked table would be a list of
  other people's credit lines.
- **Keep it as a digest, as 0312 does the publish key.** A digest can check a
  key and cannot give it back, and Loom has to send this one to Anthropic.
- **A separate sealing secret in the environment.** Cleaner to rotate on its
  own, and one more variable an operator has to set before anything works,
  for a deployment that already has a long random secret in hand. Deriving
  with a distinct label keeps the two uses apart without asking for it.
- **Fall back to the deployment's key for projects that have none.** The
  maintainer's own message is the reason not to: every project would be on his
  bill, which is exactly what he asked to stop.

## Consequences

- One new table, `loom_model_keys`, created by `pnpm db:push`. Until it runs,
  no key can be kept and nothing is proposed.
- Replacing `LOOM_PORTAL_SESSION_SECRET` signs everybody out, as it always did,
  and now also makes every project's key unreadable until its owner sets it
  again.
- `LOOM_ANTHROPIC_API_KEY` stays for the demo and the docs, which are this
  deployment's own and are not a project's.
