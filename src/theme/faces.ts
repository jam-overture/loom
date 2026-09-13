import { everyMemberOf } from "../closed-set.js"
import type { FontFace, FontPack } from "./theme.js"

/**
 * Where a face actually is, for anything that cannot look one up.
 *
 * A font pack names CSS family stacks, which is the right thing to hand a
 * browser: it already has the face, or the host's own stylesheet gives it one.
 * Anything that draws text itself has no such luxury. An image renderer cannot
 * resolve `Fraunces` to an outline, so it draws in whatever it ships with and
 * says nothing — a card renders in a grotesque and looks entirely deliberate
 * while doing it.
 *
 * A pack may therefore declare, beside the stack, where each face is. The
 * declaration is an address and nothing more: **the runtime never fetches
 * one**, so a render stays pure and a deployment keeps its own say over what it
 * talks to. A browser reads the stack exactly as before.
 */

/** The three roles a pack names a family for. */
export type FaceRole = "heading" | "body" | "mono"

export const FACE_ROLES: readonly FaceRole[] = everyMemberOf<FaceRole>()([
  "heading",
  "body",
  "mono",
])

/**
 * The CSS generic families, which name a face without addressing one.
 *
 * A stack ending in `serif` has a last resort everywhere, and there is nothing
 * for a pack to say about where that face is: the renderer either has a default
 * for the generic or it does not. They are excluded from every question below
 * about what is missing, because a source for one would be meaningless.
 */
export const GENERIC_FAMILIES: readonly string[] = [
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
]

const GENERIC_LOOKUP: ReadonlySet<string> = new Set(GENERIC_FAMILIES)

export const isGenericFamily = (family: string): boolean =>
  GENERIC_LOOKUP.has(family.trim().toLowerCase())

/**
 * The first family a stack asks for, unquoted.
 *
 * The leading family is the one the pack is actually about — everything after
 * it is the fallback chain, and a renderer that has the first needs none of the
 * rest. Quotes are stripped because a stack writes `'Space Grotesk'` and a
 * `@font-face` rule and a renderer's font table both want `Space Grotesk`.
 */
export const leadingFamily = (stack: string): string =>
  (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "")

export const familyStackForRole = (pack: FontPack, role: FaceRole): string | undefined => {
  switch (role) {
    case "heading":
      return pack.headingFamily
    case "body":
      return pack.bodyFamily
    case "mono":
      return pack.monoFamily
  }
}

/** Every face the pack says where to find, in declaration order. */
export const declaredFaces = (pack: FontPack): readonly FontFace[] => pack.faces ?? []

/**
 * The declared faces whose family is the one this role's stack leads with.
 *
 * Matched on family rather than on role, because one face serves every role
 * that asks for it: a pack setting body and mono to the same family declares
 * that face once.
 */
export const facesForRole = (pack: FontPack, role: FaceRole): readonly FontFace[] => {
  const stack = familyStackForRole(pack, role)
  if (stack === undefined) return []

  const wanted = leadingFamily(stack).toLowerCase()

  return declaredFaces(pack).filter((face) => face.family.toLowerCase() === wanted)
}

/**
 * The families this pack asks for first and does not say where to find.
 *
 * For a browser this is usually nothing to worry about: a stack leading with
 * `'Helvetica Neue'` finds it on the reader's own machine. For anything drawing
 * text itself every entry here is a face it will not have, and therefore a
 * silent fallback — which is the whole reason a pack may carry sources at all.
 *
 * In `FACE_ROLES` order, deduplicated, generics excluded.
 */
export const familiesWithoutSource = (pack: FontPack): readonly string[] => {
  const sourced = new Set(declaredFaces(pack).map((face) => face.family.toLowerCase()))
  const missing: string[] = []

  for (const role of FACE_ROLES) {
    const stack = familyStackForRole(pack, role)
    if (stack === undefined) continue

    const family = leadingFamily(stack)
    if (family === "" || isGenericFamily(family)) continue
    if (sourced.has(family.toLowerCase())) continue
    if (missing.some((seen) => seen.toLowerCase() === family.toLowerCase())) continue

    missing.push(family)
  }

  return missing
}

/**
 * The pack's declared faces as `@font-face` rules, for a host that wants them.
 *
 * Emitted on request and never mounted with the theme, because loading a face
 * is a deployment's decision rather than a pack's: the same pack is correct on
 * a host that serves the faces itself, one that links somebody else's stylesheet,
 * and one that accepts the fallback. A host that wants them puts this in a
 * `<style>`; a host that does not is unaffected.
 *
 * Empty when the pack declares no faces, so the caller has nothing to special-case.
 */
export const fontFaceRules = (pack: FontPack): string =>
  declaredFaces(pack)
    .map((face) => {
      const format = face.format === undefined ? "" : ` format("${face.format}")`

      return [
        "@font-face {",
        `  font-family: "${face.family}";`,
        `  font-style: ${face.style};`,
        `  font-weight: ${face.weight};`,
        `  src: url("${face.source}")${format};`,
        "}",
      ].join("\n")
    })
    .join("\n\n")
