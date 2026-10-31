# 0322 — A window is read off one deployment context, and the region floor is not optional

**Status:** Accepted

**Date:** 29 October 2026

**Section:** §4c (reader signals)

## Context

[0309](0309-a-window-of-counters-is-read-into-the-readings-it-holds-and-the-trees-stay-the-callers.md),
[0318](0318-a-windows-before-and-after-pairs-are-one-per-form-and-they-are-its-latest-two-revisions.md)
and
[0319](0319-the-two-libraries-a-window-holds-are-assembled-from-a-placing-the-deployment-hands-in.md)
built the rung from a store to a question in three steps: a window becomes
readings, the readings become pairs, the pairs become the two libraries. After
0319 every one of the thirty-eight readings and all nine comparisons is one call
off a window, which is what that rung was for.

**What none of the three publishes is the order they compose in.** The three
lines 0319 prints are correct and are not the obvious ones. The libraries must
be handed the pairs `windowPairsOf` produced rather than the pairs alone — the
one-line composition over `pairs` drops every unpaired form, which is where a
page published inside the window lands, so `pagesGained` reads nought on a
deployment that published two pages this week. The door rows must be the
window's whole set on both sides rather than a slice per side. And the region
floor reaches the regions through the readings, which is the one per-deployment
argument with no step of its own to take it.

**And the floor could be left out.** `windowReadingsOf`'s options argument is
optional, `regionFloorOf` is raise-only, so an absent floor is the smallest
bucket this runtime will ever name. A deployment that raised its floor to a
hundred and a surface that forgot to pass it publishes buckets of twenty-five
about real people — the one direction this subsystem's region work exists to
rule out
([0146](0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
The omission is silent, it is indistinguishable in a diff from a caller that
meant the default, and nothing in the types said whose number it was.

This lane filed the shape twice before taking it: once on 25 October with the
floor, once on 27 October with the placing, and on 28 October a third
per-deployment argument arrived and the entry said that what was worth
considering was whether the readings wanted one context. Two of the four facts
a reading needs were already handed-in shapes
([0114](0114-a-primitive-declares-what-part-it-plays-and-the-registry-is-asked.md),
[0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)); the
other two arrived one per step, as parameters nothing reminds a caller to pass.

## Decision

**`DeploymentReadingContext` and `windowAssemblyOf(window, context)` in
`src/signals/window.ts`, with the floor a required field, and
`deploymentReadingContextOf` in the app reading it where the rest of this
deployment's intake settings are read.**

1. **Four facts, one value.** The trees, the registry's declarations, the region
   floor and the form placings. All four are the deployment's and none is
   discoverable from a counter row, which is the line §7 of the plan draws:
   hold configuration you were handed rather than configuration you went
   looking for.
2. **The floor is required.** That is the change rather than the gathering. A
   caller with nothing of its own to say passes `DEFAULT_REGION_FLOOR` and has
   said so in a line a reviewer can read, where before it passed nothing and the
   reading suppressed at a number nobody chose.
3. **The floor is about the rows there are, not the switch as it stands.** A
   notice is handed a floor only where a region is being read at all
   ([0313](0313-what-a-page-collects-is-published-to-the-reader-it-collects-about.md)),
   because a notice describes what is collected now. A reading is of rows
   already collected: a deployment that switched regions off yesterday still
   holds last week's buckets, and reading those at the runtime's minimum because
   nothing is being counted today publishes exactly what the floor prevents.
4. **`windowAssemblyOf` composes the three steps in the one correct order** and
   returns all three results — the readings, the pairs and the libraries. Each
   step stays published and separately callable; what this adds is that the
   order, the door rows and the floor's route through the readings are decided
   once.
5. **Two of the three repeat counts are nought from here, by construction.**
   `windowReadingsOf` never produces two readings of one `readingKeyOf` and
   `windowPairsOf` files each form in exactly one of its two lists, so nothing
   the assembly hands on can put two readings of one form on one side of a
   library — the repeat that makes a page `ambiguous` to `pairedWindowOf` and
   takes it out of every figure while the counts above it look unchanged
   ([0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
   Both fields stay published and are carried as they come, because they are not
   nought for the callers they exist for.
6. **It adds no figure, and publishes no single total of what was dropped.** The
   three `duplicated` counts are a count of region rows, a count of readings and
   a count of forms, and `unjoined`, `unpaired` and `unplaced` are three reasons
   a page is absent from three different answers. A sum over them would be a
   number in no unit at all.
7. **The app half reads the one field only it can answer.** `readIntakeSettings`
   already reads this deployment's floor
   ([0317](0317-the-window-a-deployment-sweeps-on-is-read-where-its-other-settings-are-and-a-window-it-cannot-read-stops-the-sweep.md)),
   and `deploymentReadingContextOf` is `deploymentNoticeOf`'s sibling: a caller
   cannot hold a context for this deployment without having handed over the
   settings it came from.

## Consequences

- A surface that draws a deployment's readings writes one call and one context
  rather than three calls, two helpers and three arguments threaded through
  them. The portal view, when it is built, cannot ask a question with the floor
  missing.
- `windowReadingsOf` keeps its optional options argument, so the hazard is still
  reachable by a caller that goes a step below the assembly. That is deliberate:
  the three steps are published because each is separately useful, and narrowing
  them to make a fourth safe would take the rung's own flexibility away. The
  safe route is the shortest one, which is the direction that holds.
- Nothing reaches a reader's browser. `broadcast.ts` is byte-identical, no
  payload field, no column, no migration, no store method and no new kind. The
  assembly reads nothing a caller had not already read.
- Nothing about per-reader identity is made cheaper or dearer. The context holds
  a deployment's configuration and no fact about a person; an opt-in consent
  decision, if that door is ever opened, is a per-reader artefact and not a
  per-deployment one.
- One limit, stated: the context is a value a caller holds, so a caller that
  holds a stale one reads at a floor the deployment has since raised. It is the
  same latitude every handed-in source on this rung has, and the honest fix is
  the caller reading its settings per request, which is what the app half does.

## Alternatives considered

- **Leave the three steps and file the pattern again.** What two previous
  filings recommended, on the argument that two arguments are not a pattern. A
  third arrived, and the cost of waiting is not symmetrical: a forgotten placing
  loses a page from a figure, and a forgotten floor publishes a bucket about
  twenty-five people that a deployment refused.
- **Make `windowReadingsOf`'s options required instead.** Smaller, and it closes
  the floor hazard at its source. Rejected because it leaves the composition
  order unpublished, which is the half of this that a caller cannot get right by
  reading one signature — and it would change a published signature to carry a
  field two of its three callers have nothing to say about.
- **Read the floor inside the package, from a configuration store.** Rejected by
  §7 of the plan and by 0309: a reading path that goes looking for configuration
  is a reading path that depends on a store it does not own, and the caller
  knows better in every case.
- **A three-state floor in the context, mirroring `RegionFloorSetting`.**
  Rejected as a second spelling of a state the app already publishes. The app's
  setting carries `default`, `raised` and `refused` and resolves to the number a
  reading suppresses at; the package takes that number.
- **Publish one `dropped` total over the three `duplicated` counts and the three
  absence lists.** Tempting for a screen, and it is a figure in no unit: it
  would add a count of rows to a count of forms and report *four pages dropped*
  about one page.
- **Hand the collection schedule in too, so `collectionHealthOf` is reachable
  off the same context.** Its configuration half is per-deployment and derivable
  from the same settings
  ([0320](0320-a-notice-publishes-when-a-delivery-goes-and-the-deployment-states-the-sweep-that-takes-it.md)),
  but its other half is an instant, and a context holding a clock reading would
  answer differently on two calls over one window. Filed rather than built.
