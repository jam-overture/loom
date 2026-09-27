import Anthropic from "@anthropic-ai/sdk"

import {
  err,
  modelInterpreter,
  randomIdFactory,
  systemClock,
  type ChangeInterpreter,
  type ChangeRepairer,
} from "@jam-overture/loom"
import { anthropicModelClient } from "@jam-overture/loom/anthropic"
import { catalogueOf } from "@jam-overture/loom/sdk"

import { portalRegistry } from "./registry"

/**
 * What turns an utterance into a delta here.
 *
 * The key is read once, at module scope, and never leaves the server — 0017's
 * first and least arguable reason for putting composition behind a server-side
 * path. Two names are honoured because the scheduled agent that builds this repo
 * reserves the standard one for itself; `LOOM_ANTHROPIC_API_KEY` is what
 * actually reaches a subprocess.
 *
 * With no key, the portal runs and says so. That is deliberate: a seam whose
 * absence shows up as `interpreter-misconfigured` in the UI is more honest than
 * a portal that fails to boot, and it keeps every read path — which is most of
 * §5 — usable without a model.
 */

const apiKey = process.env["LOOM_ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_API_KEY"]

const unconfigured: ChangeInterpreter = {
  interpret: () =>
    Promise.resolve(
      err({
        code: "interpreter-misconfigured",
        detail: "no model is configured; set LOOM_ANTHROPIC_API_KEY to compose changes",
      })
    ),
}

/** One client, used for both jobs, so a repair does not open a second connection. */
const model = apiKey
  ? modelInterpreter({
      client: anthropicModelClient(new Anthropic({ apiKey }).messages),
      idFactory: randomIdFactory,
      clock: systemClock,
      /** 0013: the model is told what this deployment registered, and nothing else. */
      catalogue: catalogueOf(portalRegistry),
    })
  : undefined

export const portalInterpreter: ChangeInterpreter = model ?? unconfigured

/**
 * A refusal gets one more attempt, and only when there is a model to attempt it
 * (0006). Wiring it here rather than inside the interpreter keeps "this
 * deployment lets AI have a second go" a visible choice at the composition root.
 */
export const portalRepairer: ChangeRepairer | undefined = model

export const isInterpreterConfigured = model !== undefined
