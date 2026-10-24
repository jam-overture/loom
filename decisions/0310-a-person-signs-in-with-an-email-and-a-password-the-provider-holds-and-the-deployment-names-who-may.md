# 0310. A person signs in with an email and a password the provider holds, and the deployment names who may

**Status:** Proposed
**Date:** 2026-10-22
**Section:** §5 (portal)

> **The number is the one after the open pull requests'.** This was written as
> 0304 on 22 October; `main` took 0304 to 0306 before it merged and #700 holds
> 0307 to 0309, so it is 0310, because two records sharing one is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)).

## Context

[0285](0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md)
made an account a row with a minted key, and clause 7 said there is no sign-up
page. The maintainer asked, on 22 October, for exactly that page: *a real sign
up/in flow, complete with a password recovery*, open to his own address only
for now. A key that is the identity on its own is a good credential and a poor
way in for a person: it lives in a password manager under a name the manager
guesses, a replaced key filled in silently looks like a form that does nothing,
and when it is lost the only recovery is somebody with the database.

[0027](0027-identity-is-server-derived-and-absence-fails-closed.md) rejected an
external identity provider while the portal had a fixed roster. What it
protected — identity derived on the server, and absence failing closed — is
what this record has to keep.

## Decision

**A person signs up, signs in and recovers a password with an email address.
The password is held by Supabase Auth, the session is still ours, and the
deployment names which addresses may hold an account.**

1. **Supabase Auth holds the password**, over its REST API with `fetch` and
   no client library, the way the database is reached
   ([0022](0022-the-backing-store-is-postgres-reached-by-sql.md)). It owns
   the hashing, the confirmation email and the recovery email. A password is a
   secret this portal would otherwise have to store, rate-limit, reset and mail
   — four things that are each easy to get subtly wrong and none of which is
   the product.

2. **The session is still `loom_portal_session`.** The provider's tokens are
   used to prove a password and then dropped; the cookie carries only the
   actor, which is the email address, lowercased. So `currentActor`,
   `requireActor` and every role check are unchanged — the seam 0285's
   consequences named.

3. **`LOOM_PORTAL_EMAILS` names who may have an account, and unset is nobody.**
   An address not on it is refused at sign-up, refused at sign-in as if the
   password were wrong (and counted by the throttle), and never passed to the
   provider for a recovery email. The list is checked on our side as well as
   the provider's, because a provider whose sign-ups were left open must not
   be a way into this portal.

4. **The throttle covers passwords as it covers keys.** The address is the
   subject; a provider refusal is a failed attempt; a provider that cannot
   answer is not ([0034](0034-a-sign-in-that-cannot-be-counted-is-refused.md)'s rule, by way of
   `attemptSignIn`'s `unverified`).

5. **The recovery form gives one answer whatever happened**, so it cannot be
   asked which addresses have accounts.

6. **Minted keys still sign in** (0285 clauses 1–3 stand), folded beneath the
   password on the sign-in screen. Accounts the command line made keep
   working, and a deployment with no provider configured offers keys alone.

7. **0285 clause 7 is superseded** for deployments that configure a provider:
   there is a sign-up page, and the list in clause 3 is its invitation.

## Alternatives considered

- **Passwords held by this portal, with its own reset emails** (a table of
  password hashes and a mail sender such as Resend). Rejected for now: it
  means storing a hash, writing the reset tokens and their expiry, and running
  a mail account, each of which the provider already does and none of which is
  the product. It stays open if the provider ever has to go, because the seam
  is one module (`password-auth.ts`).
- **`supabase-js` instead of four `fetch` calls.** Rejected for 0022's reason:
  a client library brings its own session store and refresh loop, and this
  portal keeps no provider session at all.
- **Sign-in links by email, with no password.** Rejected because a person who
  asked for a password and a recovery flow asked for exactly that, and a link
  per sign-in spends the provider's hourly email allowance on every visit.
- **Opening sign-up to anyone.** Rejected for clause 3's reason: an open form
  would hand out projects and keys to whoever found it.

## Consequences

- Three new variables: `LOOM_SUPABASE_URL`, `LOOM_SUPABASE_ANON_KEY` and
  `LOOM_PORTAL_EMAILS`. The anon key is public by design and still stays off
  the client, since nothing in the browser talks to the provider.
- The provider's own settings matter: its Site URL and Redirect URLs must
  include the deployment, or confirmation and recovery links land on the
  provider's default. `docs/deployment.md` lists them.
- A recovery link carries its token in the address's fragment, so the reset
  page reads it in the browser and clears it from the address bar.
- A person who had a key-only actor and signs up with an email is a second
  actor; their memberships are granted to the email with
  `pnpm portal:account <email> <project> <role>`.
- Opening sign-up wider is a change to the list, not to code. Opening it to
  everybody would be a new record.
