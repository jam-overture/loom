import { z } from "zod"

import { err, ok, type Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { Sealer } from "./seal"

/**
 * A project's own Anthropic key, which every model call made for that project
 * is paid with (0332). The deployment's key pays for nobody's project.
 */

/**
 * The shape Anthropic issues: `sk-ant-` and then letters, digits, `-` and `_`.
 * Checked so that a pasted sentence or a key with a space in it is refused
 * where it was typed, not at three in the morning when the schedule runs.
 */
export const modelKeySchema = z
  .string()
  .regex(/^sk-ant-[A-Za-z0-9_-]{20,200}$/)
  .brand<"ModelKey">()

export type ModelKey = z.infer<typeof modelKeySchema>

/** What an owner pasted, as a key, or the sentence that says why it is not one. */
export const readModelKey = (typed: unknown): Result<ModelKey, string> => {
  const parsed = modelKeySchema.safeParse(typeof typed === "string" ? typed.trim() : "")

  return parsed.success
    ? ok(parsed.data)
    : err("That is not an Anthropic key. It starts with sk-ant- and has no spaces.")
}

/** The last four characters, which is all a screen ever shows of a key. */
export const hintOf = (key: ModelKey): string => key.slice(-4)

/** A key as it is kept: sealed, with the four characters a person recognises it by. */
export type KeptModelKey = {
  readonly sealed: string
  readonly hint: string
  readonly setAt: number
}

export type ModelKeyStoreError = { readonly code: "unavailable"; readonly detail: string }

export interface ModelKeyStore {
  /** The application's key as kept, or `null` where none is set. */
  readonly kept: (
    application: ApplicationId
  ) => Promise<Result<KeptModelKey | null, ModelKeyStoreError>>
  /** Keyed by the application, so a second key replaces the first. */
  readonly put: (
    application: ApplicationId,
    key: KeptModelKey
  ) => Promise<Result<void, ModelKeyStoreError>>
  /** Removing a key that is not there is not a failure. */
  readonly remove: (application: ApplicationId) => Promise<Result<void, ModelKeyStoreError>>
}

/** Seal a key and keep it, replacing whatever the application had. */
export const keepModelKey =
  (store: ModelKeyStore, sealer: Sealer) =>
  (
    application: ApplicationId,
    key: ModelKey,
    at: number
  ): Promise<Result<void, ModelKeyStoreError>> =>
    store.put(application, { sealed: sealer.seal(key), hint: hintOf(key), setAt: at })

/**
 * What a project's model key is, for whoever is about to spend it.
 *
 * `none` and `unreadable` are kept apart because they ask different people to
 * do different things: the first asks an owner to set one, the second says the
 * deployment's secret changed since it was set and it has to be set again.
 */
export type ModelKeyStanding =
  | { readonly kind: "set"; readonly key: ModelKey; readonly hint: string; readonly setAt: number }
  | { readonly kind: "none" }
  | { readonly kind: "unreadable"; readonly hint: string; readonly setAt: number }

export const standingOf = (kept: KeptModelKey | null, sealer: Sealer): ModelKeyStanding => {
  if (kept === null) return { kind: "none" }

  const opened = sealer.open(kept.sealed)
  const key = opened.ok ? modelKeySchema.safeParse(opened.value) : undefined

  return key?.success === true
    ? { kind: "set", key: key.data, hint: kept.hint, setAt: kept.setAt }
    : { kind: "unreadable", hint: kept.hint, setAt: kept.setAt }
}
