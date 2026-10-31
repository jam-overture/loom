import type { DeploymentReadingContext } from "@jam-overture/loom/signals"

import type { IntakeSettings } from "./settings"

/**
 * What a reading of *this* deployment's own window is handed.
 *
 * `DeploymentReadingContext` (0322) gathers the four facts every reading and
 * every comparison of a window needs, and three of them are the caller's: the
 * trees the counters were filed against, the registry's declarations, and where
 * a form the window holds one revision of belongs. **One of them is this
 * deployment's and is read off its environment** — the floor under a published
 * region bucket — and until now the only way a surface could get it was to pass
 * a number it typed.
 *
 * So this is `deploymentNoticeOf`'s sibling and the same line: the one field
 * nobody but this deployment can answer is read where the rest of its intake
 * settings are read (0317), and a caller cannot hold a context without having
 * handed over the settings it came from.
 *
 * **The floor is handed over whatever the region switch says**, which is the
 * one way this differs from the notice beside it. A notice is given a floor
 * only where a region is being read at all, because a notice describes what is
 * collected now and a deployment that counts no country should not publish a
 * bucket size for one. A reading is of rows already collected: a deployment
 * that switched regions off yesterday still holds last week's buckets, and
 * reading those at the runtime's minimum because nothing is being counted today
 * would publish exactly what the floor exists to prevent.
 *
 * Not a reading itself: no store, no clock and no counter. It is a pure
 * function of this deployment's environment and the three things its caller
 * already holds.
 */
export const deploymentReadingContextOf = (
  held: Omit<DeploymentReadingContext, "floor">,
  settings: IntakeSettings
): DeploymentReadingContext => ({ ...held, floor: settings.region.floor.floor })
