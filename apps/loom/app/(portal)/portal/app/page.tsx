import Link from "next/link"

import { STARTER_PRIMITIVES } from "@jam-overture/loom/primitives"
import { describeStoreError } from "@jam-overture/loom/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { portalDecoration } from "@/app/(portal)/_lib/addressing"
import {
  appSummary,
  libraryNote,
  MOST_PAGES_DRAWN,
  notRegistered,
  pieceUsage,
  windowNote,
} from "@/app/(portal)/_lib/app-view"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { outlineRows } from "@/app/(portal)/_lib/outline"
import { headsOf, namesIn } from "@/app/(portal)/_lib/page-name"
import { portalPolicy } from "@/app/(portal)/_lib/policy"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"

import { AppComposition, type CompositionPage } from "./_components/app-composition"
import { PieceTally } from "./_components/piece-tally"

/**
 * The screen the portal did not have, and the reason it read as a mess.
 *
 * ## What was wrong
 *
 * The maintainer, on 1 October: *"The portal is a disorganized mess. I don't know
 * what I should be looking for. I don't know what I should be looking at. I don't
 * know what I am looking at. Loom framework is a governance model. As such the
 * portal should reflect that."*
 *
 * Every screen in this portal was individually defensible and the set of them was
 * a flat list of nouns. A governance model has a subject — **the thing being
 * governed** — and the portal had no screen for it. `/portal/pieces` says what the
 * AI may build with. `/portal/pages` says what it has built. `/portal/rules` says
 * what it is allowed to do. Three true answers to three questions nobody had been
 * told to ask, because the thing all three are about was never on screen.
 *
 * This is that thing: your app, what it is made of, and how it is put together.
 * It is the first entry in the rail for the same reason Vercel opens on a project
 * and Supabase opens on a database — a tool whose first screen is a queue is a
 * tool that assumes you already know what you have.
 *
 * ## It says there is one app, because there is
 *
 * The first thing asked for was a list of registered apps. **Loom has no concept
 * of an app**: a deployment is one registry, one policy source and one store,
 * wired at a composition root, and nothing above a tree groups anything. Drawing
 * a list of one would imply a second could appear and would be the portal
 * inventing a data model the framework does not have.
 *
 * So the heading is singular and the lead says it plainly. What an app would have
 * to be for there to be several is `0209`, written `Proposed` — it is §1's
 * business, and the portal's job is to say what is true today rather than to
 * guess at what will be.
 *
 * ## The order of the screen is the governance model
 *
 * What it is → what it is built from → how it is put together → what governs it.
 * A reader who stops after the first sentence knows what they have; one who
 * stops after the second knows what the AI may reach for; one who reads to the
 * end knows the rules it is held to. Nothing here is a tile, and nothing is a
 * figure without a sentence saying why it matters.
 */
const AppPage = async () => {
  await requireActor("/portal/app")
  await ensureSeeded()

  const listed = await portalStore.list({})

  if (!listed.ok) {
    return (
      <div className="flex max-w-xl flex-col gap-4 p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl tracking-tight">We couldn&rsquo;t read your app just now.</h1>
        </header>
        <StateNotice tone="failure">
          <p>
            Nothing has been lost or changed — listing your pages only reads them. What Loom can
            build with is still on <Link href="/portal/pieces">What Loom can put on your page</Link>,
            and the rules it is held to are still on <Link href="/portal/rules">Rules</Link>.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeStoreError(listed.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      </div>
    )
  }

  const everyPage = listed.value.trees
  const inWindow = everyPage.slice(0, MOST_PAGES_DRAWN)
  const treeIds = inWindow.map((listing) => listing.treeId)

  /**
   * One fan-out for the whole screen. The trees are the composition, the names
   * are the labels and the pieces are counted from the same trees — so a count
   * here can never disagree with the tree under it, which is what a second read
   * would eventually buy.
   */
  const heads = await headsOf(portalStore, treeIds)
  const names = namesIn(treeIds, heads)
  const trees = treeIds.flatMap((treeId) => {
    const tree = heads.get(treeId)

    return tree === undefined ? [] : [tree]
  })

  const pieces = pieceUsage(portalRegistry, trees)

  const pages: readonly CompositionPage[] = treeIds.flatMap((treeId) => {
    const tree = heads.get(treeId)
    const name = names.get(treeId)

    return tree === undefined || name === undefined
      ? []
      : [{ treeId, name, tree, rows: outlineRows(tree, portalDecoration) }]
  })

  const note = windowNote(pages.length, everyPage.length)

  return (
    <div className="flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">Your app</h1>
        <p className="text-ink-muted text-sm">{appSummary(pages.length, pieces)}</p>
        {/*
          * Said once, here, and not repeated anywhere else on the screen. A
          * reader who has been told Loom governs one app does not need reminding
          * in every section, and a portal that kept saying it would read as
          * apologising for it.
          */}
        <p className="text-ink-placeholder text-xs">
          Loom looks after one app for each place you install it. This is that one.
        </p>
      </header>

      <PieceTally
        pieces={pieces}
        missing={notRegistered(portalRegistry, STARTER_PRIMITIVES)}
        library={libraryNote(STARTER_PRIMITIVES.length, pieces.length)}
      />

      {pages.length === 0 ? (
        <StateNotice
          tone="empty"
          title="Nothing has been built here yet"
          action={<Link href="/portal/pages">Go to your pages →</Link>}
        >
          <p>
            Your app has no pages, so there is nothing to put together yet. Once there is one, this
            is where you will see what it is made of.
          </p>
        </StateNotice>
      ) : (
        <>
          <AppComposition pages={pages} />
          {note !== null && <p className="text-ink-muted text-xs">{note}</p>}
        </>
      )}

      {/*
        * What governs it, last and in one line. The rules have a screen of their
        * own and this is not a second copy of it — it is the one sentence that
        * makes this screen a governance screen rather than an inventory, and the
        * link is where a reader goes to read the rest.
        */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg tracking-tight">What it is allowed to do</h2>
        <p className="text-ink-muted text-sm">
          Every change the AI proposes to any of this is weighed against one set of rules before it
          is written, and stopped for your answer when it is too unsure or too much is at stake.
        </p>
        <p className="text-xs">
          <Link href="/portal/rules">Read the rules this app is held to →</Link>
        </p>
        <TechnicalDetail summary="Which policy this app is judged by">
          <p className="font-mono">{portalPolicy.policyId}</p>
        </TechnicalDetail>
      </section>
    </div>
  )
}

export default AppPage
