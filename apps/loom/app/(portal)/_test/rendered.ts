/**
 * What a reader meets, and what is one click down, told apart.
 *
 * ## Why a rendered test cannot just read `textContent`
 *
 * A closed `<details>` is still in the document — deliberately, so a browser's
 * find-in-page reaches the technical record without anybody opening it — so
 * `container.textContent` returns the surface *and* the disclosure as one
 * string. Every assertion about the governing principle turns on exactly that
 * difference:
 *
 * > **Plain language is the default. The technical record is one click away.
 * > Nothing is ever removed.**
 *
 * `surfaceOf` is the first clause, `recordOf` is the other two. A test that
 * only had the whole string could assert that a word is *somewhere* and never
 * that it is in the right half, which is the only interesting question.
 *
 * ## Why it is finally one module
 *
 * It was written four times — `_components/proposal-effect.test.tsx`,
 * `portal/pieces/_components/piece-card.test.tsx`,
 * `portal/checkup/_components/checkup-verdict.test.tsx` and
 * `portal/rules/_components/rule-card.test.tsx` — each copy carrying a comment
 * explaining why it was copied rather than shared. The reason given every time
 * was that the files it would be merged with were open on unmerged branches,
 * and the entry filed on 4 September ends *"a helper in four places is not a
 * helper"*. All four are long since on `main`, so the reason has expired and
 * the fifth copy is the one that was not written.
 *
 * Here rather than in `_lib/` for `_test/plain-language.ts`'s reason, which is
 * the same one: this is a test concern, and a module a screen could import
 * would be a screen able to reach the thing it is being judged against.
 */

/** Everything a reader sees without opening anything. */
export const surfaceOf = (container: HTMLElement): string => {
  const shown = container.cloneNode(true) as HTMLElement

  for (const disclosure of Array.from(shown.querySelectorAll("details"))) disclosure.remove()

  return shown.textContent ?? ""
}

/** Everything behind a click, which is where the runtime's own words belong. */
export const recordOf = (container: HTMLElement): string =>
  Array.from(container.querySelectorAll("details"), (one) => one.textContent ?? "").join(" ")
