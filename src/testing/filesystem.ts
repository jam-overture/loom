import type { FileSystem } from "../cli/filesystem.js"
import { err, ok } from "../result.js"

/**
 * A filesystem in memory, so CLI tests assert on what would be written rather
 * than on what a temporary directory ended up containing. Failures are injectable
 * because "wrote two files, then the disk refused" is a path the CLI has to
 * report honestly and no real filesystem will produce on demand.
 */

export type MemoryFileSystem = FileSystem & {
  readonly files: ReadonlyMap<string, string>
}

export type MemoryFileSystemOptions = {
  readonly existing?: readonly string[]
  readonly listFails?: string
  readonly writeFailsAt?: string
}

export const memoryFileSystem = (options: MemoryFileSystemOptions = {}): MemoryFileSystem => {
  const files = new Map<string, string>((options.existing ?? []).map((path) => [path, ""]))

  return {
    files,

    list: (directory) =>
      Promise.resolve(
        options.listFails === undefined
          ? ok([...files.keys()].filter((path) => path.startsWith(`${directory}/`)))
          : err(options.listFails)
      ),

    write: (path, contents) => {
      if (options.writeFailsAt === path) return Promise.resolve(err("permission denied"))

      files.set(path, contents)

      return Promise.resolve(ok(undefined))
    },
  }
}
