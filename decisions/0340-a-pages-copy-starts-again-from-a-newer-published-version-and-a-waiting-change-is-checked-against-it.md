# 0340. A page's copy starts again from a newer published version, and a waiting change is checked against it

**Status:** Accepted — partially superseded by 0358
**Date:** 2026-11-03
**Section:** §5 (portal), §3 (write path)

## Context

[0329](0329-loom-proposes-changes-to-a-published-page-from-what-its-readers-did-on-a-copy-that-starts-as-that-page.md)
has Loom propose changes to a project's own copy of a page, which starts as the
version the site published. It left one gap in its consequences: when the site
publishes a newer version, the copy does not follow it and nothing more is
proposed for that page. A change waiting on *Waiting* also stays tied to the old
version, and accepting it would apply it to a page the site no longer serves.

The maintainer, on 3 November 2026:

> _I think it should be re-checked against new version, marked stale but
> mergeable or there are conflicts._

The governed tree store has no way to reset a tree (0268), and the Gate is the
wrong judge of the site's own version: it is a fact the site already serves, and
a customer's page built from parts outside this deployment's registry would be
refused at the critical floor and never followed at all.

## Decision

1. **A copy no accepted change has moved starts again from the site's newer
   version**, under a new tree id, and the start is recorded in
   `loom_page_copies`. The first copy of a page keeps the page's own id and has
   no row, so every copy made before this record is still read correctly.

2. **A copy an accepted change has moved is left where it is** until the site
   serves what it reached, and nothing more is proposed for the page meanwhile.
   Turning accepted changes into the site's own pages is unit 8's, and starting
   again would lose them. When the site does serve it, the copy starts again
   from that version.

3. **Every change waiting on the old copy is checked against the new one.** If
   its operations still apply, it is carried onto the new copy unchanged and
   marked *stale*: proposed for an older version, still fitting the newer one.
   Accepting it applies it to the newer version, and the Gate judges it again
   there. If its operations no longer apply, it stays on the old copy and is
   marked *conflicts*: *Accept* is not offered and it can only be turned down.

4. **A page with a conflicting change still waits on it.** 0329's one question
   per page holds, so nothing new is proposed until somebody turns it down.

5. **The copy follows as soon as the site publishes**, after the build is
   answered, and again at the start of every look, daily or *Look now*. Only
   pages something was proposed for have a copy to follow.

6. **This deployment's own site never starts its copies again.** It serves the
   copy itself (0259), so there the copy is the page.

## Alternatives considered

- **Follow by appending the difference to the copy through the write path.**
  It keeps one tree per page and its whole history, which is attractive, but it
  asks the Gate to weigh something the site has already done. A large change of
  the site's own would be held for a person to approve what readers are already
  seeing, and a page using parts this deployment cannot draw would be refused at
  the critical floor forever. Some differences are not expressible in the four
  operations at all (a changed kind or type), so the copy could never follow.
- **Mark the waiting change stale or conflicting on the screen alone, without
  moving the copy.** Cheaper, and enough to show the state, but *Accept* would
  then apply the change to the old version, which is the thing the maintainer
  asked to prevent, and proposals for the page would stay stopped.
- **Throw a conflicting change away when the copy starts again.** Keeps the
  queue clean, but the maintainer asked for conflicts to be marked rather than
  removed, and a person should see that Loom's proposal did not survive the
  site's change before Loom proposes again.
- **Re-propose a conflicting change against the new version automatically.**
  Spends the project's key on a question nobody answered yet, and the readings
  for the new version may not support it.

## Consequences

- One new table, `loom_page_copies`, created by `pnpm db:push`. Until it runs,
  nothing is proposed: the proposer reads it before it looks at a page.
- A carried change keeps the Gate's earlier verdict for display only; its stake
  can change when it is accepted against the newer page.
- A run cut off between holding a carried change and releasing the old one
  leaves it on *Waiting* twice, once as stale and once as conflicting. Turning
  the conflicting one down clears it.
- Unit 8 inherits copies that may have several generations per page, and needs
  only the current one.
