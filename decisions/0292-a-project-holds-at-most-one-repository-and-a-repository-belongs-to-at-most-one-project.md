# 0292. A project holds at most one repository, and a repository belongs to at most one project

**Status:** Accepted
**Date:** 2026-10-17
**Section:** §5 (portal), §3 (the connection)

> **Why it is raised.** The maintainer, 16 October, looking at Supabase's
> *Create a new project* screen, which offers *GitHub (optional) — choose
> repository* above the project name: *"I think one project per repo makes
> sense."*
>
> It is a cardinality, and nothing had stated one. 0275 named the connection
> *per project* and left how many repositories a project could have unsaid,
> which is the kind of silence a schema fills in by accident.

## Context

[0275](0275-a-connection-is-a-read-path-and-a-write-back-path-and-loom-never-writes-into-the-customers-store.md)
clause 1 settled where a connection lives — *"a read path and a write-back
path, named per project"* — and clause 3 settled what the first write-back is:
*"a pull request against the customer's repository."*

Between those two sits a question neither answers. **A pull request has exactly
one destination.** If a project could name two repositories, every accepted
revision would reach the moment of writing back and need a disambiguation that
nothing on the screen had collected — which is the worst place to discover a
missing field.

The grouping level has also owned nothing since it was introduced. 0269 made
the application the unit everything is stored and governed under, and
`project.ts` says plainly what is left over: *"it is organisational and nothing
else, deliberately… a project owns no policy, no members and no credentials
today."* 0285 gave it members. This gives it the thing a connection attaches
to, which is what the grouping was always shaped like without saying so.

**A repository is one of three shapes, not the only one.** 0275's own table is
the reason this record says *at most one* rather than *one*:

| | Where the tree of record lives |
| --- | --- |
| A project on a machine | files in a working copy |
| A project in a repository | files on a branch, deployed by CI |
| An app serving from its own store | a row in their database |

Two of those three have no repository at all, and clause 4 adds a fourth state
before any of them: **signals need no connection**, so *connected for
observation* is the first thing a customer reaches and the one a project starts
in.

## Decision

**A project holds at most one repository. A repository belongs to at most one
project. Neither side is required.**

1. **At most one, in both directions.** A project with no repository is the
   ordinary first state and stays legal for ever — it is what *connected for
   observation* means (0275 clause 4), and it is the only state available to
   the two customer shapes that keep their tree somewhere other than a branch.

2. **The repository is the project's, not an application's.** A project groups
   the applications that a repository holds — the deployables inside it, which
   is what `apps/` means in this repository and in most others. An application
   does not name a repository of its own, because the write-back is a pull
   request and two applications in one repository would open two against the
   same branch for one change.

3. **It is offered where the project is made**, not found later in settings. A
   connection that has to be gone looking for is one most people never make,
   and the thing it unlocks — the write-back — is the half of the product that
   is not observation.

4. **Registration stops naming the project after the application.** Today a
   person registering an application with no project chosen gets one *named
   after the application*. Under this record that is backwards: where a
   repository is given, the project is the repository's, and the applications
   are what is found inside it.

5. **Nothing about this makes a repository required to register.** The order is
   repository, then project, then applications — and every step after the first
   works with the first left empty.

## Consequences

- **The grouping level has a definition.** *What is a project* has been
  answered with *a folder you put applications in* since 0269. It is now *the
  repository those applications live in, when they live in one* — which is a
  thing a person already has a name for before they meet Loom.
- **Unit 4's registration flow changes shape** before it is built: the
  repository comes first and the project's name follows from it, which is the
  order the screen the maintainer was looking at uses and the reverse of what
  `/portal/new` does today.
- **The write-back has exactly one destination per project**, which is what
  makes unit 8 — *an accepted revision becomes a PR against their repository* —
  expressible without asking a question at the end.
- **A second repository is a second project.** That is the cost, and it is
  mostly a feature: two repositories are two review queues, two sets of
  reviewers and two deploy pipelines, which is two projects in every sense that
  matters to the person using them.
- **A monorepo is one project with several applications**, which is the shape
  this repository itself would register as.
- **Nothing is built by this record.** No column, no screen, no adapter. It
  fixes a cardinality that units 4 and 6 would otherwise each decide for
  themselves, and the point of writing it now is that they are not yet built.

## Alternatives considered

**A repository per application.** The finer grain, and it matches the unit
Loom actually governs. It fails on the write-back: a change to a tree in a
monorepo would open a pull request per application touched, against one branch,
and a person would have to merge three PRs to apply one accepted revision.

**A project may hold several repositories.** Tempting for a customer whose
product is three services, and it moves the disambiguation to the worst place
— the moment of writing back, which is the one step a person is not watching.
It would also make *the project's tree* a thing with no single source.

**A repository shared by two projects**, so one repository can be governed
twice with different policies. Rejected because a pull request would then have
two origins with no way to tell them apart in the one place it matters, and
because *different policy over the same pages* is what audiences are for
(0263).

**Say nothing and let the schema decide.** What was happening. A `repository`
column added during unit 4 would have settled this silently, as whatever that
morning's screen needed, and the first person to find out would have been
whoever built unit 8.
