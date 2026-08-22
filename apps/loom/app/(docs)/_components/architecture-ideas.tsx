import { COURSE_HREF } from "@/app/(docs)/_lib/architecture/course"
import { ARCHITECTURE_IDEAS, type ArchitectureIdea } from "@/app/(docs)/_lib/architecture/ideas"

/**
 * The eight ideas, each with the two doors out of it.
 *
 * Rendered from data rather than typed into the page for the same reason the
 * entry-point table is: the links are resolved against `lessons/` and
 * `decisions/` when the site builds, so a lesson that is renumbered or a record
 * that is withdrawn cannot leave a plausible-looking dead link behind. Typing
 * eight pairs of URLs into MDX would be typing the one thing this section
 * exists to avoid.
 *
 * A link says what is behind it — the lesson's title, the record's title —
 * and never the record's number. A reader who has not opened `decisions/` has
 * no use for four digits, and the one page in this section where numbers are
 * the subject says what they are before it shows any.
 */

const Door = ({
  label,
  title,
  href,
  note,
}: {
  readonly label: string
  readonly title: string
  readonly href?: string
  readonly note?: string
}) => (
  <div className="min-w-0 flex-1">
    <p className="text-ink-faint text-xs font-semibold tracking-wide uppercase">{label}</p>
    {href === undefined ? (
      <p className="text-ink-faint mt-1 text-sm">
        {title} <span className="italic">— {note}</span>
      </p>
    ) : (
      <p className="mt-1 text-sm">
        <a href={href} className="text-accent-strong font-medium underline underline-offset-2">
          {title}
        </a>
      </p>
    )}
  </div>
)

const Idea = ({ idea }: { readonly idea: ArchitectureIdea }) => (
  <section aria-labelledby={idea.id} className="border-edge border-t pt-6 first:border-t-0 first:pt-0">
    <h3 id={idea.id} className="text-ink text-lg font-semibold tracking-tight">
      {idea.title}
    </h3>

    <p className="text-ink-muted mt-2 leading-relaxed">{idea.plain}</p>

    <div className="border-edge bg-surface-sunken mt-4 flex flex-col gap-4 rounded-lg border px-4 py-3 sm:flex-row sm:gap-8">
      <Door
        label="Work through it"
        title={`Lesson ${idea.lesson.number} — ${idea.lesson.title}`}
        {...(idea.lesson.href === undefined
          ? { note: "not written yet" }
          : { href: idea.lesson.href })}
      />
      <Door label="The ruling" title={idea.record.title} href={idea.record.href} />
    </div>
  </section>
)

export const ArchitectureIdeas = () => (
  <div className="not-prose my-8 flex flex-col gap-6">
    {ARCHITECTURE_IDEAS.map((idea) => (
      <Idea key={idea.id} idea={idea} />
    ))}

    <p className="text-ink-faint border-edge border-t pt-6 text-sm">
      The lessons are meant to be worked through rather than read, and the course
      keeps track of what is due —{" "}
      <a href={COURSE_HREF} className="text-accent-strong font-medium underline underline-offset-2">
        start it here
      </a>
      .
    </p>
  </div>
)
