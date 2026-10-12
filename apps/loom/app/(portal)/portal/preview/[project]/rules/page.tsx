import { notFound } from "next/navigation"

import { Screen } from "@/app/(portal)/_components/screen"

import { PreviewBanner, ProjectShell } from "../../_components/shell"
import { projectBySlug } from "../../_lib/fixtures"

/**
 * Rules, from the configuration side — which is what the maintainer asked for:
 * *"you should start with the what-if view, so that I see it more from a
 * configuration side. The first level for Rules should be shown when I click
 * on maybe an info icon."*
 *
 * The screen it replaces is 299 words of prose in nine cards with **no
 * control in any of them**: it states that three parts starts to count as
 * risky and offers no way to make it four. Every sentence on it is true and
 * none of it is a setting.
 *
 * Here the setting is the row and the sentence is behind the ⓘ. The counted
 * difference is 299 words and 0 controls, against 11 controls and a caption.
 */

const Info = ({ children }: { children: React.ReactNode }) => (
  <details className="group inline">
    <summary className="text-ink-placeholder hover:text-ink-secondary ml-1 inline cursor-pointer list-none align-middle text-[11px]">
      ⓘ
    </summary>
    <p className="text-ink-muted border-edge-subtle bg-surface-page mt-1 rounded-md border px-2 py-1.5 text-[11px]">
      {children}
    </p>
  </details>
)

const Row = ({
  label,
  info,
  control,
  effect,
}: {
  label: string
  info: string
  control: React.ReactNode
  effect: string
}) => (
  <tr className="border-edge-subtle border-b">
    <td className="py-2 pr-4 align-top text-[13px]">
      {label}
      <Info>{info}</Info>
    </td>
    <td className="w-44 py-2 pr-4 align-top">{control}</td>
    <td className="text-ink-muted py-2 align-top text-[11px]">{effect}</td>
  </tr>
)

const Num = ({ value, suffix }: { value: string; suffix?: string }) => (
  <span className="flex items-center gap-1.5">
    <input
      type="number"
      defaultValue={value}
      className="border-edge bg-surface-base w-20 rounded-md border px-2 py-1 font-mono text-xs"
    />
    {suffix !== undefined && <span className="text-ink-muted text-[11px]">{suffix}</span>}
  </span>
)

const Pick = ({ options }: { options: readonly string[] }) => (
  <select className="border-edge bg-surface-base w-full rounded-md border px-2 py-1 text-xs">
    {options.map((option) => (
      <option key={option}>{option}</option>
    ))}
  </select>
)

const RulesPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  const { project: slug } = await params
  const project = projectBySlug(slug)

  if (project === undefined) notFound()

  return (
    <ProjectShell project={project} rest="/rules">
    <Screen>
      <PreviewBanner />
      <div className="flex items-baseline justify-between pb-1">
        <h1 className="text-xl tracking-tight">Rules</h1>
        <div className="flex gap-2">
          <button type="button" className="border-edge hover:bg-surface-hover rounded-md border px-2.5 py-1 text-xs">
            Try a change
          </button>
          <button
            type="button"
            className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-2.5 py-1 text-xs"
          >
            Save
          </button>
        </div>
      </div>
      <p className="text-ink-muted pb-5 text-xs">
        Judged against every change before it reaches a page. 0 of 11 changed from the default.
      </p>

      <section className="pb-6">
        <h2 className="pb-1 text-sm font-medium tracking-tight">Thresholds</h2>
        <table className="w-full border-collapse text-left">
          <tbody>
            <Row
              label="Turn a change down above"
              info="A change weighed at this risk or higher is refused outright, however it was asked for. You are not asked, because this is the line you drew rather than a judgement call."
              control={<Num value="0.9" />}
              effect="nothing has reached this yet"
            />
            <Row
              label="Ask me above"
              info="Under the refusal line, how far Loom may go alone depends on who asked. Anything above this waits for your answer."
              control={<Num value="0.4" />}
              effect="2 changes held in the last 24h"
            />
            <Row
              label="Act alone only above confidence"
              info="The model grades its own confidence in every change it writes. Below this it will not apply one by itself, however small."
              control={<Num value="0.7" />}
              effect="applied 31 of 44 unasked"
            />
            <Row
              label="Drop below confidence"
              info="Below this the change is dropped rather than sent to you. A queue full of guesses is how a review screen stops being read."
              control={<Num value="0.3" />}
              effect="dropped 6"
            />
          </tbody>
        </table>
      </section>

      <section className="pb-6">
        <h2 className="pb-1 text-sm font-medium tracking-tight">What counts as risky</h2>
        <table className="w-full border-collapse text-left">
          <tbody>
            <Row
              label="Taking parts away"
              info="How many parts a change removes before it starts counting as risky, and the count at which it is high risk."
              control={<Num value="3" suffix="→ 12" />}
              effect="median change removes 0"
            />
            <Row
              label="Reaching widely"
              info="Touching this many separate parts counts as a broad change."
              control={<Num value="8" suffix="parts" />}
              effect="widest seen: 14"
            />
            <Row
              label="Cutting near the top"
              info="A structural change at this depth or above counts as rearranging the page rather than editing it."
              control={<Num value="1" suffix="depth" />}
              effect="1 change this week"
            />
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="pb-1 text-sm font-medium tracking-tight">Always ask</h2>
        <table className="w-full border-collapse text-left">
          <tbody>
            <Row
              label="Anything that could not be cleanly undone"
              info="If Loom cannot work out how to put a change back, a person decides — however small it looks."
              control={<Pick options={["Ask me", "Turn down"]} />}
              effect="on, always"
            />
            <Row
              label="Changes that write over accepted work"
              info="A change discarding work somebody already accepted is never applied on its own, whoever asked for it."
              control={<Pick options={["Ask me", "Turn down"]} />}
              effect="on, always"
            />
            <Row
              label="Changes to where a form sends what people type"
              info="If a change would send what visitors type somewhere other than where it went before, a person is asked first."
              control={<Pick options={["Ask me", "Turn down"]} />}
              effect="on, always"
            />
            <Row
              label="Changes to which of your data a page shows"
              info="Which of your data comes out should not depend on who asked for it to change."
              control={<Pick options={["Ask me", "Turn down"]} />}
              effect="on, always"
            />
          </tbody>
        </table>
      </section>
        </Screen>
  </ProjectShell>
  )
}

export default RulesPage
