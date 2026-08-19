import { z } from "zod"

import { err, ok, type Result } from "../result.js"

import { endpointIdSchema, type EndpointId } from "./endpoint.js"

/**
 * What a node says about where it posts, as it appears in the tree.
 *
 * ```json
 * "loom:submit": { "to": "contact.enquiry" }
 * ```
 *
 * One key, and deliberately nothing else. A binding carries params because a
 * read genuinely varies — `{ "limit": 6 }` is a different question of the same
 * source — and 0058 accepted the AI-authored surface that comes with it, guarded
 * by a schema the source declares. A write does not vary that way: a deployment
 * with two mailing lists registers two endpoints, which costs one line and makes
 * the allowlist exact. Params here would add an AI-authored channel into the one
 * place a mistake sends a visitor's data somewhere it was not meant to go, and
 * buy nothing that a second registration does not.
 *
 * The object form rather than a bare id string is what leaves room to be wrong
 * about that. `{ "to": … }` can grow a key; `"contact.enquiry"` can only be
 * migrated, and migrating built trees is the cost 0001 arranged the whole delta
 * model to avoid.
 */

export type Submission = {
  readonly to: EndpointId
}

/**
 * Strict, unlike most parses of stored JSON. Zod's default is to strip what it
 * does not know, and stripping is right for a document that may have been
 * written by an older schema. Here it is not: the one thing this seam exists to
 * keep out of a tree is an address, and a declaration carrying `action` should
 * be refused loudly rather than quietly honoured as if the extra key were not
 * there. A key added later is a key this schema will know about.
 */
const submissionSchema = z.object({ to: endpointIdSchema }).strict()

export type SubmissionError = {
  /** The path of the offending entry, for a diagnostic a person can act on. */
  readonly path: string
  readonly message: string
}

export const describeSubmissionError = (error: SubmissionError): string =>
  `${error.path}: ${error.message}`

/**
 * Parses the value of `loom:submit`. Total, like every other parse of something
 * that came out of storage: a malformed declaration is reported and the node
 * renders with no target, rather than throwing on a page nobody can then see.
 */
export const parseSubmission = (declared: unknown): Result<Submission, SubmissionError> => {
  const parsed = submissionSchema.safeParse(declared)

  if (!parsed.success) {
    const [issue] = parsed.error.issues

    return err({
      path: issue && issue.path.length > 0 ? issue.path.map(String).join(".") : "loom:submit",
      message: issue?.message ?? "is not an endpoint id under `to`",
    })
  }

  return ok({ to: parsed.data.to })
}
