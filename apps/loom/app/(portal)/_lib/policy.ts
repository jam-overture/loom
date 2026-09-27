import { defaultGatePolicy, type GatePolicy, type PropsVocabulary } from "@jam-overture/loom"
import { propsVocabularyFor, registeredTypesFor } from "@jam-overture/loom/sdk"

import { portalRegistry } from "./registry"

/**
 * The rules this deployment judges every change by.
 *
 * Lifted out of `write.ts` so that the path which *enforces* the policy and the
 * screen which *describes* it read one object rather than two copies of the same
 * import. A screen that told a reader the AI must be 70% sure while the Gate was
 * consulting something else would be worse than a screen that said nothing: it
 * is a claim about what is allowed on your pages, and the whole value of making
 * it is that it is checkable.
 *
 * It was `defaultGatePolicy` unchanged, described here as "the honest state of
 * this deployment". That was true of the four fields the rules screen listed and
 * false of a fifth nobody had listed, which is the thing worth recording:
 *
 * ## The floor this deployment had left open for a month
 *
 * [0173](../../../../../decisions/0173-a-change-may-not-add-a-primitive-the-deployment-cannot-draw.md)
 * gave the Gate the ability to refuse a change that adds a kind of part nothing
 * here can draw, and made it **opt-in** — a host that declares nothing is a host
 * that has not spoken, and a default reading of "I can draw nothing" would refuse
 * every insert on every deployment in existence. So the field defaults to empty
 * and the check never fires, which is exactly what this portal had: a proposal
 * naming `app.gallery` was weighed on its shape, found unremarkable, **committed**,
 * and drew a hole on the page for every reader rather than for the one who asked.
 *
 * `Loom marketing` closed the same hole on its own surface on 23 September and
 * filed the other three lanes' rows as a finding. This is the portal's row. The
 * list is derived rather than written out, for the reason `registeredTypesFor`
 * gives: a hand-kept copy that misses a type the registry has refuses changes
 * this deployment could have drawn perfectly well, and every primitive added is
 * another chance to forget.
 *
 * Deriving it also makes one property free and worth naming, because it is the
 * one a reviewer of `/portal/rules` is entitled to: **what the Gate will refuse
 * to write is, by construction, what the renderer would refuse to draw.** They
 * read the same registry.
 *
 * The other half of 0173's pair — whether a part's own settings are checked
 * before the change is written (0179) — is **not** a policy field: it is a
 * function on the runtime. It lives in this module anyway, below, because of what
 * this module is *for*. The asymmetry has a consequence this lane could not fix
 * and has filed.
 */
export const portalPolicy: GatePolicy = {
  ...defaultGatePolicy,
  registeredPrimitiveTypes: registeredTypesFor(portalRegistry),
}

/**
 * Whether a part's own settings are checked before a change carrying them is
 * written, and what does the checking.
 *
 * ## Why it is in this file and not in `write.ts`
 *
 * 0179's floor is a function on the runtime rather than a field on the policy, so
 * the natural home is the module that assembles the runtime. It is here instead,
 * because this module's whole reason for existing is the sentence at the top of
 * it: **the path that enforces the rules and the screen that describes them read
 * one object.** `/portal/rules` claims to name every rule a change here is judged
 * by. A rule it could not see would make that claim false, and a screen that
 * imported the write path to find out would be a screen holding a handle to the
 * store and the hold custody in order to read a boolean.
 *
 * ## The boolean is derived, which is the only version of it worth having
 *
 * `settingsAreChecked` is not a constant somebody sets beside the wiring and
 * hopes stays true. It is read off the one value the write path actually uses, so
 * a deployment that sets `portalPropsVocabulary` to `undefined` turns the check
 * off **and** makes the rules screen say so, in one edit. A hand-kept `true` is
 * how a screen ends up describing a rule that was removed a month ago — which is
 * the exact failure `registeredPrimitiveTypes` has just been fixed for.
 *
 * The annotation is what keeps it derived: without `| undefined` the type narrows
 * to the function, the comparison is statically true, and the next reader is
 * entitled to delete it as dead code.
 */
export const portalPropsVocabulary: PropsVocabulary | undefined =
  propsVocabularyFor(portalRegistry)

export const settingsAreChecked = portalPropsVocabulary !== undefined
