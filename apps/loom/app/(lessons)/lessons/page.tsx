import type { Metadata } from "next"

/**
 * The one page the lessons shell ships with, and it says what it is.
 *
 * A route group with no route in it is not reachable and not testable, so the
 * migration leaves exactly one page behind: enough for `/lessons` to answer, for
 * the route table to be checkable, and for the owner of this lane to have
 * somewhere to start. The eleven lessons written so far live in `lessons/` as
 * markdown; turning them into this surface is that routine's work, not the
 * migration's.
 */

export const metadata: Metadata = {
  title: "Lessons",
  description: "The Loom course. Being built.",
}

const LessonsIndex = () => (
  <main>
    <h1>Lessons</h1>
    <p>
      The Loom course is being built here. Until it is, the lessons are markdown in the
      repository&rsquo;s <code>lessons/</code> directory.
    </p>
  </main>
)

export default LessonsIndex
