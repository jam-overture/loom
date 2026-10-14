import { readdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"

import { err, ok, type Result } from "../../src/result.js"

import { storedSize } from "./visuals.js"

/**
 * The one file here that knows what an image encoder is.
 *
 * Resolved at call time and never a dependency, for the reason
 * [0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
 * gives about Playwright: re-encoding a picture is a thing a run does, not a
 * thing the framework ships, and `pnpm verify` must not need a platform binary
 * to tell you a file is too big. `reports:check` only calls `stat`. This is
 * reached by `reports:shrink` and by the screenshot harness, both of which are
 * already run by hand with `LOOM_PLAYWRIGHT` set.
 *
 * `sharp` is usually already on disk here without being installed: Next.js
 * declares it optionally, so pnpm fetches it into the store and links it to
 * nothing. The store is therefore the last search path, which is why this works
 * in this repository with no `package.json` entry and no flag.
 */

export type ShrinkerError = {
  readonly code: "no-sharp"
  readonly reason: string
  readonly searched: readonly string[]
}

export type Shrunk = {
  readonly bytes: Uint8Array
  readonly width: number
  readonly height: number
}

/**
 * `scale` is what the picture was captured at, not what it will be stored at —
 * `storedSize` decides that, in one place, so the harness and the command that
 * fixes up what the harness already wrote cannot disagree.
 */
export type Shrinker = (
  source: Uint8Array,
  scale: number
) => Promise<Result<Shrunk, string>>

/** Quality 82 measured as the point where a flat UI screenshot stops changing. */
const QUALITY = 82

type SharpModule = {
  default: (input: Uint8Array) => {
    metadata: () => Promise<{ width?: number | undefined; height?: number | undefined }>
    resize: (options: { width: number; height: number; fit: "fill" }) => {
      webp: (options: { quality: number }) => { toBuffer: () => Promise<Uint8Array> }
    }
  }
}

const asSharp = (loaded: unknown): SharpModule["default"] | undefined => {
  const candidate = (loaded as { default?: unknown }).default
  return typeof candidate === "function" ? (candidate as SharpModule["default"]) : undefined
}

/** `node_modules/.pnpm/sharp@<version>/node_modules`, if the install left one there. */
const storeCandidates = async (root: string): Promise<readonly string[]> => {
  const store = `${root}/node_modules/.pnpm`
  const entries = await readdir(store).catch(() => undefined)
  if (entries === undefined) return []
  return entries
    .filter((entry) => entry.startsWith("sharp@"))
    .sort()
    .reverse()
    .map((entry) => `${store}/${entry}/node_modules`)
}

export const sharpSearchPaths = (
  env: Readonly<Record<string, string | undefined>>
): readonly string[] =>
  [env.LOOM_SHARP, env.NODE_PATH]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .flatMap((value) => value.split(":"))
    .filter((value) => value.length > 0)

export const loadShrinker = async (
  searchPaths: readonly string[] = sharpSearchPaths(process.env),
  root: string = process.cwd()
): Promise<Result<Shrinker, ShrinkerError>> => {
  const paths = [...searchPaths, ...(await storeCandidates(root))]
  const attempts: string[] = []
  const specifiers: string[] = ["sharp"]

  for (const path of paths) {
    try {
      const resolved = createRequire(import.meta.url).resolve("sharp", { paths: [path] })
      specifiers.push(pathToFileURL(resolved).href)
    } catch (cause) {
      attempts.push(cause instanceof Error ? cause.message : "unknown")
    }
  }

  for (const candidate of specifiers) {
    try {
      const sharp = asSharp(await import(candidate))
      if (sharp === undefined) {
        attempts.push(`${candidate} has no default export`)
        continue
      }
      return ok(async (source, scale) => {
        try {
          const read = sharp(source)
          const { width, height } = await read.metadata()
          if (width === undefined || height === undefined) return err("no dimensions")
          const target = storedSize({ width, height, scale })
          const bytes = await sharp(source)
            .resize({ ...target, fit: "fill" })
            .webp({ quality: QUALITY })
            .toBuffer()
          return ok({ bytes, ...target })
        } catch (cause) {
          return err(cause instanceof Error ? cause.message : String(cause))
        }
      })
    } catch (cause) {
      attempts.push(cause instanceof Error ? cause.message : "unknown")
    }
  }

  return err({ code: "no-sharp", reason: attempts[0] ?? "not found", searched: paths })
}

export const describeShrinkerError = (error: ShrinkerError): string =>
  [
    `sharp could not be resolved (${error.reason}).`,
    "",
    "  pnpm add -g sharp && LOOM_SHARP=$(pnpm root -g) pnpm reports:shrink",
    "",
    `searched: ${error.searched.length === 0 ? "nothing — set LOOM_SHARP" : error.searched.join(", ")}`,
  ].join("\n")
