import { collectionNoticeOf, type CollectionNotice } from "@jam-overture/loom/signals"

import type { IntakeSettings } from "./settings"

/**
 * What *this* deployment collects, as it may publish it to the readers it
 * collects about.
 *
 * `collectionNoticeOf` (0313) is the framework's answer to *what does this page
 * report about me?*, derived from the schema and from the configuration it is
 * handed. This is the one line nobody could write honestly until tonight: it
 * hands it **this deployment's own configuration**, read from the environment in
 * [`settings.ts`](./settings.ts) rather than described in prose.
 *
 * Three numbers in a notice are a deployment's rather than the framework's —
 * how long a delivery takes to ripen, the floor under a published country, and
 * how often the sweep that deletes a ripe one runs — and the window was the
 * one of those that lived in a sweep script. A privacy page cannot be derived
 * from a `const` in `scripts/`.
 *
 * ## What it reads, and what it deliberately does not
 *
 * **Every kind, always.** The notice names what the configuration permits,
 * which is `notice.ts`'s ceiling rule: a page narrows the kinds it broadcasts
 * and the notice still names all five, because the alternative is a disclosure
 * that has to be republished whenever a page changes its options — and one that
 * would understate the day a page widened them. An intake does not know what
 * any page was broadcast with in any case: `kinds` is the host's argument to
 * `broadcastReaderSignals` and never reaches the endpoint.
 *
 * **A country only where one is read.** `region` is handed over only when the
 * switch is `on`, which is the one state in which the door reads a header
 * (`receive.ts`). Off and misspelled both count no region, and the notice then
 * says *nothing about where you are is read* rather than publishing a floor
 * under a bucket that does not exist.
 *
 * **The window as configured, not as clamped.** A value that cannot be read is
 * reported as the default the sweep would have used, because the sweep refuses
 * to run on it at all — which is a louder failure than a notice can carry, and
 * is why `describeCollectionWindow` exists for the operator who has to fix it.
 *
 * **A sweep ceiling only where the deployment stated one.** Nothing in this
 * repository can discover how often a cron outside it runs, so an unstated or
 * unreadable interval publishes the weaker sentence rather than a ceiling
 * nobody promised — and `describeSweepSchedule` is the operator's half, as
 * with the window.
 *
 * ## What it is not
 *
 * Not a consent gate, not a banner, and not a reading: no store, no clock, no
 * counter. It is a pure function of this deployment's environment, and nothing
 * in it is about a person — per-reader identity is parked, and a notice is the
 * artefact that would have to change if it ever returned, not a step toward it.
 */
export const deploymentNoticeOf = (settings: IntakeSettings): CollectionNotice =>
  collectionNoticeOf({
    windowMs: settings.window.windowMs,
    /**
     * Spread rather than handed `undefined`, which is the same shape
     * `receive.ts` reads the switch with: under `exactOptionalPropertyTypes` an
     * absent region and a region that is explicitly nothing are two different
     * arguments, and only the first of them means *no country is read*.
     */
    ...(settings.region.chosen.state === "on"
      ? { region: { floor: settings.region.floor.floor } }
      : {}),
    /**
     * Spread for the same reason, and handed over only where the deployment
     * stated an interval. An unstated or unusable schedule publishes an age
     * with *nothing here promises when it goes* beside it, which is the honest
     * sentence for a deployment nobody can prove sweeps at all (0320).
     */
    ...(settings.sweep.state === "stated" ? { sweep: { everyMs: settings.sweep.everyMs } } : {}),
  })
