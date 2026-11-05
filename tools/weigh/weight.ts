import { styleTexts } from "./style.js"
import { repetitionIn, type Repetition, type Unmeasured } from "./repetition.js"

/**
 * Where a served document's bytes are.
 *
 * One reading, taken on the artefact a reader is actually sent. Everything else
 * in the gate asks whether the source is right; `pnpm prerender:check` asks what
 * the build produced; this asks what a response weighs and what inside it is
 * paid for more than once.
 */

export type WeighedStyle = {
  readonly bytes: number
  /** Absent when the text has no landmark a copy would share. `describeUnmeasured` says so. */
  readonly repetition: Repetition | undefined
  readonly unmeasured: Unmeasured | undefined
}

export type DocumentWeight = {
  readonly bytes: number
  /** Heaviest repetition first, which is the order a reader of the output wants. */
  readonly styles: readonly WeighedStyle[]
  /** What the document would be lighter by if every style above were carried once. */
  readonly repeatedBytes: number
}

export const weighDocument = (document: string): DocumentWeight => {
  const styles = styleTexts(document)
    .map((text) => {
      const measured = repetitionIn(document, text)

      return measured.ok
        ? { bytes: text.length, repetition: measured.value, unmeasured: undefined }
        : { bytes: text.length, repetition: undefined, unmeasured: measured.error }
    })
    .sort((left, right) => (right.repetition?.repeatedBytes ?? 0) - (left.repetition?.repeatedBytes ?? 0))

  return {
    bytes: document.length,
    styles,
    repeatedBytes: styles.reduce((total, style) => total + (style.repetition?.repeatedBytes ?? 0), 0),
  }
}
