import Link from "next/link"

import { PREVIEW_PROJECTS, type PreviewProject } from "../_lib/fixtures"
import { SECTIONS, sectionFor, type Section } from "./nav"

/**
 * The chrome: a breadcrumb top bar, a labelled icon rail, and a second rail
 * for the section you are in.
 *
 * Measured against the portal it replaces, which is a 56px rail of twelve
 * unlabelled icons over a single flat list of twenty-two routes, with no
 * notion of which project anything belongs to.
 */

const ICONS: Readonly<Record<string, React.ReactNode>> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  pages: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  pieces: (
    <>
      <rect x="2.5" y="7" width="19" height="13.5" rx="1.5" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </>
  ),
  rules: (
    <>
      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  logs: (
    <>
      <path d="M3 5h18M3 12h18M3 19h12" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>
  ),
}

const Glyph = ({ name }: { name: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px] shrink-0"
    aria-hidden
  >
    {ICONS[name]}
  </svg>
)

const Caret = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 opacity-50" aria-hidden>
    <path d="m8 9 4-4 4 4M8 15l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Crumb = ({ children, href }: { children: React.ReactNode; href?: string }) =>
  href === undefined ? (
    <span className="flex items-center gap-1.5 text-sm">{children}</span>
  ) : (
    <Link
      href={href}
      className="hover:bg-surface-hover flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm no-underline"
    >
      {children}
    </Link>
  )

export const TopBar = ({ project }: { project?: PreviewProject }) => (
  <header className="border-edge-subtle bg-surface-base fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-1 border-b px-3">
    <Link href="/portal/preview" className="flex items-center gap-2 px-1 no-underline">
      <span className="bg-affirm border-affirm-edge h-5 w-5 rounded border" />
      <span className="text-sm font-medium tracking-tight">loom</span>
    </Link>

    <span className="text-ink-placeholder px-1">/</span>
    <Crumb href="/portal/preview">
      Overture
      <span className="border-edge text-ink-muted rounded border px-1 text-[10px] tracking-wide uppercase">
        pro
      </span>
      <Caret />
    </Crumb>

    {project !== undefined && (
      <>
        <span className="text-ink-placeholder px-1">/</span>
        <Crumb href="/portal/preview">
          {project.name}
          <Caret />
        </Crumb>
      </>
    )}

    <div className="flex-1" />

    {project !== undefined && (
      <Link
        href={`/portal/preview/${project.slug}/settings/credentials`}
        className="border-edge hover:bg-surface-hover flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs no-underline"
      >
        Connect
      </Link>
    )}
    <span className="border-edge text-ink-placeholder ml-1 hidden rounded-md border px-2.5 py-1 text-xs md:block">
      Search…
    </span>
    <span className="bg-surface-active ml-1 h-6 w-6 rounded-full" />
  </header>
)

const SecondRail = ({ section, base }: { section: Section; base: string }) => (
  <nav className="border-edge-subtle bg-surface-base fixed top-12 bottom-0 left-14 z-30 w-56 overflow-y-auto border-r px-3 py-4">
    <p className="px-2 pb-3 text-sm font-medium tracking-tight">{section.label}</p>
    {section.groups?.map((group) => (
      <div key={group.name} className="pb-4">
        <p className="text-ink-muted px-2 pb-1 text-[10px] tracking-widest uppercase">
          {group.name}
        </p>
        <ul className="list-none p-0">
          {group.items.map((item) => (
            <li key={item.href}>
              <Link
                href={`${base}${item.href}`}
                className="text-ink-secondary hover:bg-surface-hover flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] no-underline"
              >
                {item.label}
                {item.soon === true && (
                  <span className="text-ink-placeholder text-[10px] uppercase">soon</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
)

/**
 * The icon rail. Labels sit under the glyphs at rest rather than behind a
 * hover, which is the whole difference between six destinations a person can
 * read and six they have to try.
 */
const IconRail = ({ base, active }: { base: string; active: string }) => (
  <aside className="border-edge-subtle bg-surface-sidebar fixed top-12 bottom-0 left-0 z-40 flex w-14 flex-col items-center gap-0.5 border-r py-3">
    {SECTIONS.map((section) => (
      <Link
        key={section.key}
        href={`${base}${section.path}`}
        title={section.label}
        aria-current={section.key === active ? "page" : undefined}
        className={`flex w-12 flex-col items-center gap-1 rounded-md py-1.5 no-underline ${
          section.key === active
            ? "bg-surface-active text-ink"
            : "text-ink-muted hover:bg-surface-hover"
        }`}
      >
        <Glyph name={section.icon} />
        <span className="text-[9px] leading-none tracking-tight">{section.label}</span>
      </Link>
    ))}
  </aside>
)

/**
 * Every preview screen says so, unmissably. A prototype that can be mistaken
 * for the product is worse than no prototype: the numbers below are invented
 * and somebody will otherwise read one as a measurement.
 */
export const PreviewBanner = () => (
  <div className="border-awaiting bg-awaiting text-awaiting-ink mb-5 rounded-md border px-3 py-2 text-xs">
    <strong className="font-medium">Prototype.</strong> Every number, project and log line on
    this screen is invented. It is here to be argued with, not to be read.{" "}
    <Link href="/portal" className="underline">
      The portal as it stands →
    </Link>
  </div>
)

export const ProjectShell = ({
  project,
  rest,
  children,
}: {
  project: PreviewProject
  rest: string
  children: React.ReactNode
}) => {
  const section = sectionFor(rest)
  const base = `/portal/preview/${project.slug}`
  const hasSecond = section.groups !== undefined

  return (
    <>
      <TopBar project={project} />
      <IconRail base={base} active={section.key} />
      {hasSecond && <SecondRail section={section} base={base} />}
      <main className={`pt-12 ${hasSecond ? "pl-[280px]" : "pl-14"}`}>
        <div className="mx-auto max-w-[1180px] px-7 py-6">
          <PreviewBanner />
          {children}
        </div>
      </main>
    </>
  )
}

export const WorkspaceShell = ({ children }: { children: React.ReactNode }) => (
  <>
    <TopBar />
    <main className="pt-12">
      <div className="mx-auto max-w-[1180px] px-7 py-8">
        <PreviewBanner />
        {children}
      </div>
    </main>
  </>
)

export { PREVIEW_PROJECTS }
