import Anthropic from "@anthropic-ai/sdk"

import {
  err,
  modelInterpreter,
  randomIdFactory,
  systemClock,
  type ChangeInterpreter,
  type ChangeRepairer,
  type ModelClient,
} from "@jam-overture/loom"
import { anthropicModelClient } from "@jam-overture/loom/anthropic"
import { catalogueOf } from "@jam-overture/loom/sdk"

import type { ModelKey } from "@/app/_lib/models/model-keys"

import { portalRegistry } from "./registry"

/**
 * The model a project's changes are worked out with, paid for with that
 * project's own key (0332). Nothing here reads the deployment's environment:
 * a project with no key has no model, and no other project's key or this
 * deployment's is used in its place.
 *
 * Built per call rather than held, because the key is the project's and a
 * module-scope client would be one project's key serving everybody's.
 */
export type ProjectModel = {
  /** The connection itself, for a caller asking the model something other than a change. */
  readonly client: ModelClient
  readonly interpreter: ChangeInterpreter
  /** A refusal gets one more attempt with the same model (0006). */
  readonly repairer: ChangeRepairer
}

export const projectModel = (key: ModelKey): ProjectModel => {
  const client = anthropicModelClient(new Anthropic({ apiKey: key }).messages)
  const model = modelInterpreter({
    client,
    idFactory: randomIdFactory,
    clock: systemClock,
    /** 0013: the model is told what this deployment registered, and nothing else. */
    catalogue: catalogueOf(portalRegistry),
  })

  return { client, interpreter: model, repairer: model }
}

/**
 * The interpreter a write that composes nothing is given. Answering a held
 * change re-runs the Gate over a proposal that already exists, so it needs no
 * model and spends nobody's key; this says so if anything ever asks it to.
 */
export const noInterpreter: ChangeInterpreter = {
  interpret: () =>
    Promise.resolve(
      err({
        code: "interpreter-misconfigured",
        detail: "this write was begun without a model, so it cannot compose a change",
      })
    ),
}
