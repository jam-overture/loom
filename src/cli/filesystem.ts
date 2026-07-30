import { mkdir, readdir, writeFile } from "node:fs/promises"

import { err, ok, type Result } from "../result.js"

/**
 * The CLI's only impure seam.
 *
 * Two operations, both fallible, both returning a Result — so `run.ts` stays a
 * function of a listing and a plan, and its tests need no temporary directories.
 * A missing directory lists as empty rather than failing: "nothing here yet" is
 * the ordinary case for `init`, not an error.
 */

export interface FileSystem {
  readonly list: (directory: string) => Promise<Result<readonly string[], string>>
  readonly write: (path: string, contents: string) => Promise<Result<void, string>>
}

const describe = (thrown: unknown): string => (thrown instanceof Error ? thrown.message : String(thrown))

const isMissing = (thrown: unknown): boolean =>
  typeof thrown === "object" && thrown !== null && "code" in thrown && thrown.code === "ENOENT"

const directoryOf = (path: string): string => path.slice(0, path.lastIndexOf("/"))

export const nodeFileSystem: FileSystem = {
  list: async (directory) => {
    try {
      const entries = await readdir(directory, { withFileTypes: true, recursive: true })

      return ok(
        entries
          .filter((entry) => entry.isFile())
          .map((entry) => `${entry.parentPath}/${entry.name}`.replaceAll("//", "/"))
      )
    } catch (thrown) {
      return isMissing(thrown) ? ok([]) : err(describe(thrown))
    }
  },

  write: async (path, contents) => {
    try {
      const parent = directoryOf(path)
      if (parent !== "") await mkdir(parent, { recursive: true })

      await writeFile(path, contents, "utf8")

      return ok(undefined)
    } catch (thrown) {
      return err(describe(thrown))
    }
  },
}
