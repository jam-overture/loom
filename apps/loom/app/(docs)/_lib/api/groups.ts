/**
 * What to call a module, when its own file name is a poor heading.
 *
 * The default is the file's name — `tree/navigation` becomes "Navigation",
 * which is right far more often than it has any business being — and the
 * paragraph under the heading is the module's own opening line, so a heading
 * rarely has to carry much. The map below is only for the names that say
 * nothing twice: `tree/tree`, `store/store`, and the pairs where two files an
 * inch apart are called `resolve` and `resolution`.
 *
 * It is checked. A label naming a module the package no longer publishes fails
 * `extract.test.ts`, so a renamed file cannot leave behind a heading that
 * describes nothing.
 */
export const MODULE_TITLES: Readonly<Record<string, string>> = {
  "tree/tree": "Trees",
  "tree/node": "Nodes",
  "tree/inverse": "Undoing a delta",
  "tree/compare": "Comparing two trees",
  "tree/mutation": "Changing a tree",
  "tree/naming": "What to call a node",
  "tree/outline": "The outline a reviewer reads",
  "render/render": "Rendering",
  "render/request": "One render, end to end",
  "store/store": "Stores",
  "store/source": "Reading a tree back",
  "theme/theme": "Themes",
  "theme/apply": "Applying a theme",
  "cli/run": "Running a command",
  "cli/args": "Reading the arguments",
  "cli/plan": "What a command will do",
  "data/resolve": "Resolving a binding",
  "data/resolution": "What a resolved binding says",
  "data/plan": "Planning the reads",
  "data/source": "A source a node may name",
  "submit/resolve": "Resolving a destination",
  "submit/resolution": "What a resolved destination says",
  "submit/plan": "Planning a form's destination",
  "submit/declaration": "Declaring where a form posts",
  "runtime/nesting": "A target inside a target",
  "runtime/proposal": "Proposals",
  "runtime/intent": "What was asked for",
  "runtime/assessment": "What the Gate weighed",
  "runtime/interpreter": "The model seam",
  primitives: "The starter library",
  ids: "Ids",
  result: "Results, and the errors they carry",
  json: "JSON, narrowly defined",
  paging: "Paging",
  catalogue: "The catalogue a model is shown",
  "primitive-type": "Primitive names",
  "reserved-props": "The loom: namespace",
  interactivity: "Which primitives are targets",
}

/** A module named for a primitive — `primitives/loom.card` — is called that and nothing else. */
const IS_PRIMITIVE_NAME = /\./

/** The heading for a module: the override where there is one, its own name otherwise. */
export const moduleTitle = (module: string): string => {
  const override = MODULE_TITLES[module]

  if (override !== undefined) return override

  const leaf = module.split("/").at(-1) ?? module

  if (IS_PRIMITIVE_NAME.test(leaf)) return leaf

  const words = leaf.replace(/-/g, " ")

  return `${(words[0] ?? "").toUpperCase()}${words.slice(1)}`
}
