import Anthropic from "@anthropic-ai/sdk"

import { modelInterpreter, randomIdFactory, systemClock, type ChangeInterpreter } from "@jam-overture/loom"
import { anthropicModelClient } from "@jam-overture/loom/anthropic"
import { catalogueOf } from "@jam-overture/loom/sdk"

import { demoRegistry, demoThemes } from "./registry"

/**
 * The model, told what this surface registered and what it may be themed with —
 * and nothing else about the deployment (0013).
 *
 * Separate from `lib/interpreter.ts` because they are told different things: the
 * portal's model sees the portal's four primitives, and this one sees the
 * eighteen a marketing page is built from. One shared interpreter would mean one
 * of the two surfaces describing a registry it does not use.
 *
 * No repairer is wired. A refusal here is the Gate saying no in front of a
 * visitor, which is the demo working; a second, quieter attempt would be the
 * runtime arguing with its own verdict on stage.
 */

const apiKey = process.env["LOOM_ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_API_KEY"]

const model = apiKey
  ? modelInterpreter({
      client: anthropicModelClient(new Anthropic({ apiKey }).messages),
      idFactory: randomIdFactory,
      clock: systemClock,
      catalogue: catalogueOf(demoRegistry),
      themeCatalogue: demoThemes.catalogue(),
    })
  : undefined

export const demoModelInterpreter: ChangeInterpreter | undefined = model

/**
 * With no key the demo still works: every preset is interpreted deterministically
 * and the whole pipeline runs. Only the free-text box is unavailable, and it says
 * so rather than failing when it is used.
 */
export const isDemoModelConfigured = model !== undefined
