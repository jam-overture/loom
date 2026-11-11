/**
 * The file `/why-use-it` prints under *Hook up your preferred AI model*, as the
 * text the page renders.
 *
 * ## The step this site had never shown
 *
 * The front door states four steps, and three of them now land somewhere a
 * visitor can go and watch them being true: *What stays yours* and *What you
 * write* for the first two, *What changed and what let it through* for the
 * fourth. The third read:
 *
 * > *"Loom is AI model agnostic. Pick the model you already use, or bring your
 * > own. Loom sends it what your users are doing, and it suggests changes from
 * > there."*
 *
 * The first sentence is the maintainer's of 1 October and the rest is this
 * lane's built on it (`copy.ts` says which is which). It is a claim about
 * **what it takes**, and `docs/routines.md` has the rule this lane keeps
 * arriving back at: the only honest way to back a claim about quantity is to
 * show the quantity. `/why-use-it` argued the bands either side of this step
 * and had nothing in between about the part a reader would write.
 *
 * ## Why the source is a constant here and a file beside it
 *
 * `written.ts` carries the whole of this argument and nothing about it is
 * different here: `connected/your-model.ts` is a real module the gate compiles
 * against the published interface, this is the text the page renders, and
 * `connected.test.ts` holds the two together. A marketing route is
 * `force-dynamic` by
 * [0331](../../../../../decisions/0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md),
 * so a `readFileSync` at render time would run in a function with no
 * repository under it and fail only once deployed.
 *
 * **What is different is how far the check goes.** The registration panel is
 * put through the door a deployment uses, which proves it is accepted. This one
 * is driven over HTTP by a server the test starts and the answer is handed to
 * `modelInterpreter`, which proves a model connected this way produces a change
 * Loom can act on. That is the difference between a panel that compiles and a
 * panel that works, and this band's claim needs the second.
 */

/** The marker in the specimen; everything after it is what the site prints. */
export const SHOWN_MARKER = "// ── shown on the site ──"

export type ConnectedFile = {
  /** What the panel is captioned with, which is the filename a reader would use. */
  readonly caption: string
  /** The specimen this came from, relative to this directory. */
  readonly from: string
  /** The published region of that file, exactly. */
  readonly source: string
}

/**
 * One function, and it is the whole of bringing a model of your own.
 *
 * Two things in it are worth a reader's attention and the copy under the panel
 * names both: the fields being handed across are the provider's own names, so
 * the panel is where a reader sees the translation they have to write; and the
 * two refusals come back as different words, because Loom does different things
 * with them.
 */
export const YOUR_MODEL: ConnectedFile = {
  caption: "your-model.ts",
  from: "connected/your-model.ts",
  source: `import type { ModelClient } from "@jam-overture/loom"
import { err, ok } from "@jam-overture/loom"

export const yourModel = (apiKey: string, endpoint: string): ModelClient => ({
  complete: async (request, options) => {
    const answer = await fetch(endpoint, {
      method: "POST",
      signal: options?.signal ?? null,
      headers: {
        authorization: \`Bearer \${apiKey}\`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        max_output_tokens: request.maxTokens,
        instructions: request.system,
        input: request.userMessage,
        reply_shape: request.outputSchema,
      }),
    })

    if (answer.status === 401 || answer.status === 403) {
      return err({ code: "misconfigured", detail: "the key was refused" })
    }

    if (!answer.ok) {
      return err({ code: "unavailable", detail: \`status \${answer.status}\` })
    }

    const body = (await answer.json()) as { text: string; model: string }

    return ok({ text: body.text, servedBy: body.model })
  },
})`,
}

export const CONNECTED_FILES: readonly ConnectedFile[] = [YOUR_MODEL]

/** The language the panel declares. It is TypeScript and not a component. */
export const CONNECTED_LANGUAGE = "ts"

/**
 * The two words the panel hands back on a refusal, quoted in the copy beside
 * it so the sentence and the snippet cannot say different things.
 *
 * They are `ModelClientError` codes rather than words this lane chose, and
 * `connected.test.ts` drives the interpreter with each of them to show they
 * land on different outcomes. A sentence claiming the distinction matters, over
 * a panel where it does not, is the shape this band exists to avoid.
 */
export const REFUSAL_CODES: readonly string[] = ["misconfigured", "unavailable"]
