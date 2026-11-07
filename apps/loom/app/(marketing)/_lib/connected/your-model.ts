/**
 * The panel under *Hook up your preferred AI model*, and the whole of what
 * Loom asks of a model you bring yourself.
 *
 * The front door's third step is the maintainer's own line of 1 October with a
 * sentence of this lane's built on it — *"Loom is AI model agnostic. Pick the
 * model you already use, or bring your own."* It is the only one of his four
 * steps the site has never shown, and `/why-use-it` argued the two either side
 * of it (what your page reports, and what the model does with it) with nothing
 * in between about the part a reader would have to write.
 *
 * ## Why it is a module and not a string
 *
 * Same arrangement as `written/` beside it and for the same reason, which
 * `written.ts` carries at length: `connected.ts` holds the text the page
 * renders, this is the copy the **typechecker** reads, and `connected.test.ts`
 * holds the two together. The annotation below is the load-bearing line of the
 * file — `ModelClient` is a published interface, so the day it grows a member
 * this specimen stops compiling and the gate goes red on this lane rather than
 * on a stranger who pasted it.
 *
 * ## It is driven over real HTTP in the test, not type-checked and left
 *
 * `connected.test.ts` starts a server on an ephemeral port, points this factory
 * at it, and hands what comes back to `modelInterpreter`. So the claim the band
 * makes is not *this compiles*: it is that a model connected this way produces
 * a change Loom can act on. Nothing is mocked and nothing is stubbed, which is
 * why the endpoint is a parameter rather than a constant in the body.
 *
 * **The endpoint is a parameter for a second reason, and a reader needs it
 * anyway.** Every provider has its own address, and several have one per
 * region; a factory that hid it would be showing a shape nobody can use.
 *
 * ## The five failure codes are the framework's and are not optional
 *
 * `ModelClientError` keeps them apart because each names a different actor —
 * `misconfigured` is an operator's to fix, `unavailable` is nobody's, and the
 * interpreter maps each to a different outcome. A specimen that collapsed them
 * into one would be teaching a reader to report *ask again later* for a key
 * that will never work, which is the mistake `client.ts` says was made in the
 * framework itself until day 37. Three of the five are reachable from a status
 * code and are shown; the two that are about the reply rather than the call
 * belong to whatever a provider puts in its body, so the band says so in prose
 * instead of guessing at a field name.
 *
 * ## Everything below the marker is published
 *
 * So there are no comments in it, nothing in it is clever, and the imports are
 * inside the region: a reader has to see which package each name comes from,
 * and a region that omitted them would not compile on its own.
 */

// ── shown on the site ──
import type { ModelClient } from "@jam-overture/loom"
import { err, ok } from "@jam-overture/loom"

export const yourModel = (apiKey: string, endpoint: string): ModelClient => ({
  complete: async (request, options) => {
    const answer = await fetch(endpoint, {
      method: "POST",
      signal: options?.signal ?? null,
      headers: {
        authorization: `Bearer ${apiKey}`,
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
      return err({ code: "unavailable", detail: `status ${answer.status}` })
    }

    const body = (await answer.json()) as { text: string; model: string }

    return ok({ text: body.text, servedBy: body.model })
  },
})
