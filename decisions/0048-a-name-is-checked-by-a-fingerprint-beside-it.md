# 0048. A policy's name is checked by a fingerprint stored beside it

**Status:** Accepted
**Date:** 2026-08-10
**Section:** §2 → §6

## Context

0033 made the policy resolvable per change and stamped its name onto every
verdict, so a stored disposition can say what standard it was decided under. The
name is host-declared, and that put a contract on the host rather than a
mechanism in the runtime: **a name identifies content.** A host that changes what
a policy contains gives it a new name, because every disposition already written
under the old one claims to have been judged by what that name meant then.

0033 said plainly that the runtime could not check this, and left a fingerprint
"stored alongside the name" open if drift proved real.

0047 made it real. Calibration now segments by policy name and reads a survival
rate per gate. A host that edited `checkout` in place — nudged `minimumConfidence`
from 0.7 to 0.8 and moved on — produces one row over two gates, and the row is
presented with exactly the confidence of a correct one. That is the same pooling
error 0047 exists to correct, one level down, and it is worse there: the reader
has been told the page is segmented, so the caveat they would have applied to a
pooled number is gone.

The failure mode is mundane, which is why it will happen. Nobody sets out to
misattribute a verdict; they edit a config file and forget that a name is load
bearing.

## Decision

**The Gate stamps a fingerprint of the policy's contents onto every disposition,
beside the name and never instead of it.** `policyFingerprintOf` is a pure,
synchronous function of a `GatePolicy`, and `Disposition.policyFingerprint`
carries the result.

Five properties, each of which is the decision rather than a detail of it:

- **Beside, not instead.** A digest is not a name a person can look up in their
  own configuration, which is the reason 0033 rejected minting the id in the
  first place, and that reason still holds. The name is how a host finds the
  policy; the fingerprint is how a reader knows the name still means what it
  meant. Neither replaces the other.

- **The fingerprint has two halves — `shape:values` — and they answer different
  questions.** `shape` digests which knobs exist; `values` digests what they are
  set to. Without the split, a version of Loom that adds a policy field would
  change every fingerprint in every corpus, and every reader would report that
  hosts had edited policies they had never touched. With it, records from either
  side of an upgrade are **incomparable** — an explicit "cannot tell" rather than
  a confident wrong answer. The `incomparable` state is not speculative
  generality: it is what the next policy field to be added will produce.

- **The name is excluded from the digest.** A rename is not an edit, and folding
  the name in would make the two indistinguishable — which would defeat the point,
  since renaming on edit is exactly the discipline 0033 asked for and this exists
  to reward.

- **The digest is of meaning, not of spelling.** Vocabulary lists are membership
  tests, and `ceilingFor` reads its record by key, so list order, repeated
  entries, key order, and an explicitly-`undefined` ceiling change no decision and
  change no digest. A reformatted configuration file is not a policy change.

- **It is stamped inside `gate`, like the name.** A caller could supply a
  fingerprint other than the one the rules consulted, and a disposition claiming
  contents it was not decided under is worse than one claiming none.

The hash is **FNV-1a, 64-bit, written out in the module.** A cryptographic digest
means `crypto.subtle`, which is asynchronous, and the Gate is synchronous and pure
by 0002 and 0033 — stamping a fingerprint must not be the thing that makes a
decision await something. This is an integrity check against accident, not a
seal: a host that wants its records to misdescribe its policy can simply change
nothing, and no digest reaches that.

**On the reader side**, each `PolicyCalibration` segment carries the distinct
fingerprints its judgments named, and separately the count of judgments that
named none. `rulesetContinuityOf` reads the list as one of four states —
`unrecorded`, `single`, `changed`, `incomparable`. The count stays outside the
list because one fingerprint plus fifty unfingerprinted judgments is not a
segment shown to be constant, and a list of length one would say that it was.

**The field is optional and never defaulted** (0045). Unlike `policyId`, which has
an honest stand-in for the unknown in `unattributed`, a digest has none: any
string in that position is a claim about the contents of a policy, and inventing
one would be inventing the very fact the field exists to check.

**The portal's breakdown now appears when a single segment's rules changed**, where
before it required two segments. One name over two rulesets is a pooled page with
one row, and staying silent there would reproduce 0047's failure exactly.

## Consequences

The contract 0033 stated is now checkable. A host that edits a policy without
renaming it still gets one row on the calibration page, but the row says so, and
says how many rulesets are behind it.

Nothing enforces the contract, and that is deliberate. The Gate does not refuse to
judge under an edited policy, and the runtime does not rename anything on a host's
behalf (0012's posture: probed and reported, never enforced). Drift is a fact
about a host's configuration discipline, and the useful thing to do with it is
show it to whoever can fix it.

Every judgment recorded before this run is unfingerprinted, permanently. During
the alpha most segments will report a mixture, and a reader will see "partly
recorded" more often than either clean state. That is the honest reading of a
corpus that spans the change, and it decays on its own.

A fingerprint is worth exactly as much as the projection behind it. A `GatePolicy`
field that escaped the digest would report "unchanged" about a policy that had
changed — worse than having no fingerprint at all — so the projection is a mapped
type over `keyof Omit<GatePolicy, "policyId">`, and adding a knob is a compile
error until someone says how it is digested.

Two fingerprints that differ tell a reader *that* the rules changed and not *how*.
Answering that needs the policy documents, which the runtime deliberately does not
store (0033, 0023). A host that wants a diff has its own configuration history.

## Alternatives considered

**Leave the contract stated and unchecked, as 0033 did.** Rejected now that 0047
reads names back and presents per-gate rates as findings. A stated contract is
enough when nothing depends on it; this one now has a page built on top of it.

**Make the fingerprint the id — mint or hash the name itself.** Rejected again,
for 0033's reason unchanged: a host has to find the policy in its own
configuration, and `a3f1c8...` is not something anyone looks up. Keeping both is
what makes the pair informative.

**Hash with SHA-256.** Rejected. It would make the Gate's stamp asynchronous or
force a synchronous crypto dependency that the edge runtime may not carry, and
there is no adversary here — only a forgotten edit. Collision resistance across
the handful of policies a host runs is not the property under strain.

**Digest the whole policy including its name.** Rejected: it conflates a rename
with an edit, and a rename is the correct behaviour we are trying to detect the
absence of.

**Reflect over the policy object rather than projecting it explicitly.** Rejected.
Reflection covers new fields automatically, which sounds like the safer default
until a field is added whose value is a function, a `Date`, or a nested optional —
then the digest silently starts depending on serialisation accidents. The mapped
type gives the same coverage guarantee as a compile error, at a call site where
someone has to think about what the new knob means.

**Segment calibration by `(name, fingerprint)` rather than by name.** Rejected,
and it contradicts 0047: a verdict belongs to the gate the *host* named, and two
rows both labelled `checkout` would be unreadable — a reader cannot tell which is
which without the digests, which are not names. Reporting drift inside the segment
keeps 0047's partition intact and puts the finding where the reader is looking.

**Store the policy document itself so a reader can diff it.** Rejected, for the
reason 0023 and 0033 already gave: it is one static document copied onto every
change, and two copies of a configuration eventually disagree. A digest is bounded
and answers the question actually being asked, which is whether the name held.
