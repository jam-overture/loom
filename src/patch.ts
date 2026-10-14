/**
 * The three things a partial update can say about one field, and the one place
 * they are spelled.
 *
 * A store's update method takes the fields a caller wants changed and leaves
 * the rest alone, which is the right shape and leaves one thing unsayable. If
 * an absent field means *leave it alone*, nothing means *remove it* — so a
 * record with an optional field could be given one and never have it taken
 * away. The field that found this was an application's host: a person who
 * empties the box on a settings screen and presses save means *I do not have a
 * host any more*, and the only call available said nothing about the host at
 * all, which renames nothing and reports success.
 *
 * So a patch field carries three states rather than two: a value sets it,
 * `null` clears it, and absent still leaves it alone. `null` rather than an
 * empty string, because an empty string is a value the schemas go on refusing —
 * one spelling of nothing per field is the point, and a second would have every
 * store deciding for itself which of the two it honoured.
 *
 * Clearing **removes the key** rather than setting it to `undefined`. The
 * schemas these patches are parsed against are strict and spell an absent field
 * optional, so a key holding `undefined` is not what a record that never had
 * the field looks like, and the two must not be told apart by which route they
 * arrived by.
 */

/**
 * One field of a patch: a value to set, or `null` to clear it.
 *
 * Absent is the third state and is not spelled here, because it is the
 * property's own optionality rather than anything this type can say. A field
 * typed `host?: Patch<string>` reads as all three.
 */
export type Patch<T> = T | null

/**
 * A partial update over `T`: every field optional, and every one clearable.
 *
 * `| undefined` is written out rather than left to the `?`, so that a caller
 * may pass a field it has read as absent instead of having to build the object
 * by spreading around it.
 */
export type PatchOf<T> = {
  readonly [K in keyof T]?: Patch<NonNullable<T[K]>> | undefined
}

/**
 * `subject` with every field the patch mentions applied, and nothing else
 * touched.
 *
 * The result is a new object; the subject is not modified. It is not validated
 * either — a caller parses what comes back against the schema that owns the
 * record, which is what keeps two stores agreeing about what a thing is rather
 * than about what fits in a column.
 */
export const applyPatch = <T extends object>(subject: T, patch: PatchOf<T>): T =>
  Object.entries(patch).reduce<Record<string, unknown>>(
    (applied, [field, change]) => {
      if (change === undefined) return applied

      if (change === null) {
        const { [field]: _cleared, ...kept } = applied
        return kept
      }

      return { ...applied, [field]: change }
    },
    { ...subject } as Record<string, unknown>
  ) as T
