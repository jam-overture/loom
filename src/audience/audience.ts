/**
 * The group of readers a form of a page was served to.
 *
 * An audience is a **predicate over the opaque render context** — site, region,
 * locale, cohort, flag, whatever the host puts in `RenderRequest.context` — and
 * the match is evaluated in the customer's own process, per request, with
 * nothing about the reader leaving it (0263 clauses 1 and 4).
 *
 * **None of that predicate is here.** What this module holds is the *name* a
 * signal carries once the deciding is done: an opaque id, on the terms
 * [0283](../../decisions/0283-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
 * settles. What an `aud_` means is the control plane's to say, exactly as what
 * an `app_` means is — so this file is an identity and a default, which is the
 * whole of what a dimension needs to be measurable.
 */

import { z } from "zod"

import { idPattern } from "../grammar.js"
import { randomIdBody } from "../ids.js"

/*
 * `aud`, spelled rather than initialled, for the reason an application id is:
 * it is a value a person reads off a screen and puts into their own rules.
 */
export const audienceIdSchema = z.string().regex(idPattern("aud")).brand<"AudienceId">()

export type AudienceId = z.infer<typeof audienceIdSchema>

/** A new audience's id, minted when somebody defines one. Random, as every other is. */
export const newAudienceId = (): AudienceId => audienceIdSchema.parse(`aud_${randomIdBody()}`)

/**
 * The audience that matches every reader.
 *
 * What a deployment serving one form of every page has always been doing
 * without having a word for it, which is why it is also what a signal naming
 * no audience is filed under. Rows written before this dimension existed read
 * as this one, and that is true of them rather than a guess (0260): there was
 * one form of every page, so every reader was in the same group.
 *
 * **It is not a null.** Every read filters on it and every write sets it; what
 * makes it the default is only that it is the one a sender gets by saying
 * nothing. A nullable dimension would make every counter read a two-case
 * question, one of whose cases no sender can produce (0283).
 */
export const DEFAULT_AUDIENCE_ID: AudienceId = audienceIdSchema.parse("aud_everyone")
