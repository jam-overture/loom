# 0296. A project holds exactly one application, and the portal never names it

**Status:** Accepted
**Date:** 2026-10-18
**Section:** §5 (portal), §1 (the hierarchy)

> **Why it is raised.** The maintainer, 18 October: *"One project = one repo =
> one loom app."*
>
> **It revisits something he decided six days earlier.**
> [0269](0269-an-application-is-the-unit-loom-governs-and-a-project-groups-them.md)
> put two levels to him directly — *"everyone pays a navigation level whether or
> not they group"* — and records the answer: *"He wanted three."* What changed in
> between is that the levels stopped being a diagram and became a screen.

## Context

0269 settled what the levels *are*: an application is the unit everything is
stored and governed under, a project groups applications, an account sits above
both and is not yet data. Nothing here disturbs that.

What it deliberately left open is **how many** a project groups, and the answer
has been *any number* by default ever since. Three things have since attached
themselves to the question:

- **0285** gave the project members. A role is held in a project.
- **0292** gave the project a repository, at most one in each direction.
- **Unit 3** put projects on a screen, and the screen has to say *application*
  somewhere or pretend the level is not there.

So a person registering one site now meets a project, an application inside it,
a role on the project, a repository on the project, and — once unit 4 lands — a
key that must belong to the application, because
[0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
and 0273 put `application_id` on ten tables and that is the dimension which
makes two customers' readers separable. Five nouns for one website.

## Decision

**A project holds exactly one application, created with it. The portal never
names the application. The hierarchy is unchanged.**

1. **One application per project, minted at registration.** Not *at most one* —
   exactly one, created in the same act as the project, so there is no state in
   which a project has nothing to scope rows by.

2. **The word in the product is *project*.** The card, the repository, the key,
   the roles, the settings and the snippet are all the project's as far as
   anybody reading a screen is concerned. No surface says *application*, and
   none offers a way to add a second.

3. **`application_id` survives untouched**, as the column it already is on ten
   tables. It is what rows are scoped by and what keeps two deployments'
   readers apart; collapsing the vocabulary does not remove the need for a
   scoping key, it only means one is minted per project and never spoken of.

4. **The ingest key is the application's in the schema and the project's in the
   product**, and there is exactly one, because there is exactly one
   application. The key resolves to an `ApplicationId` — which it must, since
   that is what the reader tables carry.

5. **The rule for a new field**: it goes on the **application** if anything
   scoped reads it, and on the **project** if only a person does. That is the
   line 0269 already drew — the project is what somebody organises by, the
   application is what rows hang off — and it is written here because 1:1 makes
   the two easy to confuse.

6. **0269 is not superseded.** Its decision stands in every clause; this fixes a
   cardinality it left open and settles what the portal shows. The level is
   still there, which is the whole reason this is reversible.

## Consequences

- **Nothing migrates.** No column moves, no id is renamed, and the two
  migrations that put `application_id` on the reader tables last week keep their
  meaning exactly.
- **A person meets one thing.** A project is a repository is a Loom app, which
  is three words for the same object and the sentence the maintainer used.
- **Registration creates both in one act**, and a failure to create either is a
  failure to register. A project without its application would be a project
  that cannot take a signal, and it would hold the name while being useless —
  the same trap 0289 names about closing.
- **The grouping is available and empty.** If a monorepo customer ever needs two
  deployables under one repository, the level exists and the change is a screen
  rather than a schema. That is what keeping it buys, and 0269's *"a grouping he
  can leave empty costs less than one he cannot add"* is still the argument.
- **A vestigial level has a standing cost**, and it is fair to name it: two
  tables for one object means every new field needs clause 5 applied, and every
  screen joins. This record accepts that cost in exchange for no migration and a
  reversible decision.
- **Unit 4 gets simpler.** The repository, the project and the key are one
  registration, and the ambiguity in the plan's one-job text — which says a
  *project* gets a key, written when `prj_` still meant what is now an
  application — stops mattering, because under 1:1 both readings name the same
  thing.

## Alternatives considered

**Collapse the schema to one level.** The literal reading of *one project = one
app*, and the expensive one: 34 files reference an application id and 18 DDL
statements carry the column, on ten tables that took two migrations last week.
0269's own warning is the measure — *"the merge cost of renaming later is not
the rename."* It also buys nothing a person can see, because the scoping column
has to exist whatever it is called. **It stays available**: if the level is
still empty when accounts become real, deleting it is a better-informed decision
then than now.

**Keep *any number* and show both levels.** What 0269 allowed and what unit 3
built. Rejected on the observation put to the maintainer on 12 October and now
seen rather than imagined: everyone pays a navigation level whether or not they
group, and the first customer to pay it was the maintainer looking at his own
workspace.

**Mint the application lazily, on the first signal.** Tempting because it keeps
registration to one row. Rejected: the key is handed over at registration and a
key must name an application, so the thing it names cannot be created later by
something a stranger triggers.

**Let the project *be* the application — one table, both ids.** The halfway
house, and the worst of the three: it keeps two vocabularies and two id
prefixes while removing the only thing that made them separable, so every query
would carry a column whose name disagrees with the table it is in.
