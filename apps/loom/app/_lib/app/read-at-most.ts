/**
 * The body, up to the ceiling and one byte past it.
 *
 * Measured off the bytes rather than off `content-length`, because the header is
 * a number the caller wrote, and the endpoints that read a body this way are
 * the ones whose callers are strangers. Reading one byte past the limit is what distinguishes *exactly
 * at the ceiling* from *over it* without reading any more of an over-large body
 * than it takes to know.
 *
 * A caller who sends nothing gets an empty string, which the parser refuses
 * like any other malformed delivery.
 */
export const readAtMost = async (
  request: Request,
  limit: number
): Promise<{ readonly text: string; readonly bytes: number }> => {
  const body = request.body

  if (body === null) return { text: "", bytes: 0 }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value === undefined) continue

      chunks.push(value)
      bytes += value.byteLength

      if (bytes > limit) break
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }

  const joined = new Uint8Array(bytes)
  let at = 0
  for (const chunk of chunks) {
    joined.set(chunk, at)
    at += chunk.byteLength
  }

  return { text: new TextDecoder().decode(joined), bytes }
}
