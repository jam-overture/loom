import type { Result } from "@jam-overture/loom"

import {
  COOKIE_SENTENCE,
  NOT_IN_EFFECT,
  WINDOW_MEANING,
  privacyNoticeSentence,
  windowSentence,
} from "@/app/(portal)/_lib/reader-window"
import type { KeptReaderWindow } from "@/app/_lib/pages/reader-windows"

import { ReaderWindowControls } from "./reader-window-controls"

/** The sentence to paste into the site's privacy notice, for a window that sets the cookie. */
const PrivacyNotice = ({ sentence }: { sentence: string | undefined }) =>
  sentence === undefined ? null : (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-xs">For your site&rsquo;s privacy notice:</p>
      <blockquote className="border-edge-subtle text-ink-muted m-0 border-l-2 pl-3 text-xs">
        {sentence}
      </blockquote>
    </div>
  )

/**
 * *Settings*' part for how long a reader keeps the pages they first saw
 * (0383): what a window does, the one the project has, that it is not in
 * effect yet, the choice for an owner, and what it puts on readers' devices.
 *
 * A store that did not answer offers no choice, because the boxes would start
 * on a window nobody read and saving them could quietly undo one.
 */
export const ReaderWindowSection = ({
  projectId,
  owner,
  changeable,
  kept,
}: {
  projectId: string
  owner: boolean
  /** An owner of an open project. */
  changeable: boolean
  kept: Result<KeptReaderWindow | null, { readonly detail: string }>
}) => (
  <section
    id="reader-window"
    className="border-edge-subtle bg-surface-base flex scroll-mt-20 flex-col gap-3 rounded-lg border p-4"
  >
    <h2 className="text-sm font-medium tracking-tight">How long a reader keeps a page</h2>
    <p className="text-ink-muted m-0 text-xs">
      {WINDOW_MEANING} {windowSentence(kept)}
    </p>
    <p className="text-ink-muted m-0 text-xs">{NOT_IN_EFFECT}</p>
    {changeable && kept.ok ? (
      <ReaderWindowControls projectId={projectId} chosen={kept.value?.window ?? "off"} />
    ) : (
      !owner && <p className="text-ink-muted m-0 text-xs">Only an owner can change it.</p>
    )}
    <p className="text-ink-muted m-0 text-xs">{COOKIE_SENTENCE}</p>
    {kept.ok && kept.value !== null && (
      <PrivacyNotice sentence={privacyNoticeSentence(kept.value.window)} />
    )}
  </section>
)
