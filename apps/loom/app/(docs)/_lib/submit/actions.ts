import {
  createEndpointRegistry,
  defineEndpoint,
  describeEndpointRegistryError,
  describeSubmissionUnavailable,
  ok,
  resolveTreeSubmissions,
  walkTree,
  type SubmissionTarget,
} from "@loom/runtime"

import { contactExampleTree } from "@/app/(docs)/_lib/examples/catalogue"

/**
 * What the seam will and will not carry as a form's action.
 *
 * Every row on the page's table is produced by registering an endpoint that
 * answers with that exact string and asking for it. Nothing here reads the
 * schema and reports what it thinks the schema would say: the endpoint says
 * yes, and then the seam either carries it or refuses it.
 *
 * This is the check that is **not** about AI-authored input. An action never
 * comes from a tree, so nothing a model writes reaches this string. What it
 * catches is a host's own composition mistake — a base URL that was empty, a
 * path joined from a config value — at the one moment it can still be caught,
 * which is after the host has already decided it is correct.
 */

/** One candidate action, and what the seam did with it. */
export type ProposedAction = {
  /** The string the endpoint answered with, shown as written. */
  readonly action: string
  /** What it is, in a sentence a person could repeat. */
  readonly what: string
  readonly accepted: boolean
  /** Where the form would actually post, or why nothing will. */
  readonly outcome: string
}

type Candidate = {
  readonly id: string
  readonly action: string
  readonly what: string
  readonly accepted: boolean
}

/**
 * Seven strings a host might reasonably end up with, four of which are wrong.
 *
 * The middle two are the pair the schema exists for, and they are the reason a
 * leading-slash check is not enough. `//forms.example.net` is scheme-relative
 * and reaches another origin; `/\forms.example.net` is the same thing written
 * with a backslash, which browsers normalise to the first. Both begin with a
 * slash. Both look like paths.
 */
const CANDIDATES: readonly Candidate[] = [
  {
    id: "action.same-origin",
    action: "/contact",
    what: "A path on this site.",
    accepted: true,
  },
  {
    id: "action.elsewhere",
    action: "https://forms.example.com/enquiry",
    what: "Another origin, said out loud.",
    accepted: true,
  },
  {
    id: "action.scheme-relative",
    action: "//forms.example.net/collect",
    what: "Another origin wearing a leading slash.",
    accepted: false,
  },
  {
    id: "action.backslash",
    action: "/\\forms.example.net/collect",
    what: "The same thing again, with a backslash a browser straightens out.",
    accepted: false,
  },
  {
    id: "action.script",
    action: "javascript:fetch('/drain')",
    what: "Not an address at all.",
    accepted: false,
  },
  {
    id: "action.relative",
    action: "contact",
    what: "Relative to whatever route the form is rendered on, which nobody chose.",
    accepted: false,
  },
  { id: "action.empty", action: "", what: "Nothing, meaning “post to this page”.", accepted: false },
]

const askFor = async (candidate: Candidate): Promise<ProposedAction> => {
  const target: SubmissionTarget = { action: candidate.action, method: "post", fields: [] }

  const built = createEndpointRegistry([
    defineEndpoint({
      id: candidate.id,
      description: candidate.what,
      endpoint: { target: () => Promise.resolve(ok(target)) },
    }),
  ])

  if (!built.ok) {
    throw new Error(`loom: ${candidate.id} was refused — ${describeEndpointRegistryError(built.error)}`)
  }

  const tree = contactExampleTree(candidate.id)
  const form = Array.from(walkTree(tree.root)).find(
    (node) => node.kind === "element" && node.type === "loom.form"
  )

  if (form === undefined) throw new Error("loom: the contact page has no form on it")

  const resolution = await resolveTreeSubmissions(tree, { registry: built.value })
  const outcome = resolution.lookup(form.id)

  if (outcome === undefined) throw new Error(`loom: ${candidate.id} was planned and never resolved`)

  const accepted = outcome.status === "ready"

  if (accepted !== candidate.accepted) {
    throw new Error(
      `loom: this page claims "${candidate.action}" is ${candidate.accepted ? "carried" : "refused"} and the seam disagreed`
    )
  }

  return {
    action: candidate.action,
    what: candidate.what,
    accepted,
    outcome:
      outcome.status === "ready"
        ? `the form posts to ${outcome.target.action}`
        : describeSubmissionUnavailable(outcome.unavailable),
  }
}

export const produceActions = async (): Promise<readonly ProposedAction[]> =>
  Promise.all(CANDIDATES.map(askFor))
