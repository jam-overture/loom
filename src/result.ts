/**
 * Loom never throws across a module seam. Every fallible operation returns a
 * Result so callers must acknowledge failure in the type system.
 */
export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError }

export const ok = <TValue>(value: TValue): Result<TValue, never> => ({ ok: true, value })

export const err = <TError>(error: TError): Result<never, TError> => ({ ok: false, error })

export const mapResult = <TValue, TNext, TError>(
  result: Result<TValue, TError>,
  transform: (value: TValue) => TNext
): Result<TNext, TError> => (result.ok ? ok(transform(result.value)) : result)

export const flatMapResult = <TValue, TNext, TError>(
  result: Result<TValue, TError>,
  transform: (value: TValue) => Result<TNext, TError>
): Result<TNext, TError> => (result.ok ? transform(result.value) : result)

/**
 * Folds a sequence of fallible steps over an accumulator, short-circuiting on
 * the first error. This is how atomic multi-operation deltas are applied.
 */
export const reduceResult = <TItem, TAccumulator, TError>(
  items: readonly TItem[],
  initial: TAccumulator,
  step: (accumulator: TAccumulator, item: TItem, index: number) => Result<TAccumulator, TError>
): Result<TAccumulator, TError> => {
  let accumulator = initial

  for (const [index, item] of items.entries()) {
    const stepped = step(accumulator, item, index)
    if (!stepped.ok) return stepped
    accumulator = stepped.value
  }

  return ok(accumulator)
}

/**
 * Exhaustiveness guard for discriminated unions. Reaching it is a type error at
 * compile time and an explicit failure at runtime.
 */
export const assertNever = (value: never, context: string): never => {
  throw new Error(`${context}: unhandled variant ${JSON.stringify(value)}`)
}
