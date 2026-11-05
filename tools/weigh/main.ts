import { readFile } from "node:fs/promises"

import { describeWeight } from "./describe.js"
import { weighDocument } from "./weight.js"

/**
 * `pnpm weigh <url-or-file> …` — what a served document weighs, and what inside
 * it is paid for more than once.
 *
 * **Not part of `pnpm verify`, and that is the decision rather than an
 * omission.** The reading needs a response, which needs a built application and
 * a server, and a gate that starts one is a gate that can hang — `0140`'s rule
 * applied to the merge gate rather than to a render. It is a command a run
 * invokes beside `pnpm shoot`, and what it finds belongs in a report.
 *
 * A file argument is read from disk so a run can weigh a response it has
 * already captured, which is how the output below is reproducible without a
 * server at all.
 */

const subjects = process.argv.slice(2)

if (subjects.length === 0) {
  process.stderr.write("usage: pnpm weigh <url-or-file> …\n")
  process.exit(1)
}

const fetched = async (url: string): Promise<string> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)

  return response.text()
}

const documentFor = async (subject: string): Promise<string> =>
  /^https?:\/\//.test(subject) ? fetched(subject) : readFile(subject, "utf8")

let unread = 0

for (const subject of subjects) {
  try {
    process.stdout.write(`${describeWeight(subject, weighDocument(await documentFor(subject)))}\n`)
  } catch (cause) {
    unread += 1
    process.stderr.write(`${subject}  not read: ${cause instanceof Error ? cause.message : String(cause)}\n`)
  }
}

process.exit(unread === 0 ? 0 : 1)
