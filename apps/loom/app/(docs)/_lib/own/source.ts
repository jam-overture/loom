import { readFileSync } from "node:fs"
import { join } from "node:path"

import { REPOSITORY_ROOT } from "../architecture/source"
import { asAReaderWouldWrite } from "../packages"

import { OWN_PRIMITIVE_PATH } from "./registry"

/**
 * The primitive's file, as a reader would write it. Read at build time; the
 * browser gets only the text.
 *
 * A module of its own because of where it is read from. `registry.ts` is reached
 * from the example catalogue, which is reached from a client component, and a
 * `node:fs` import anywhere in that graph fails the production build rather than
 * being tree-shaken away. So the filesystem lives here, and only the server
 * component that prints the block imports it.
 *
 * Verbatim but for the import specifiers, which is the quickstart's arrangement
 * and the same argument: this workspace reaches the starter library at the door
 * published from `dist/`, and a reader reaches it at the name they installed.
 * `packages.ts` owns that mapping, and `teaches.test.ts` is what refuses a page
 * that tells a stranger to type the workspace's door.
 */
export const readOwnPrimitiveSource = (): string =>
  asAReaderWouldWrite(readFileSync(join(REPOSITORY_ROOT, ...OWN_PRIMITIVE_PATH), "utf8"))
