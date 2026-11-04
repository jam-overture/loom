/**
 * The one report `/why-use-it` prints, as the text the page renders.
 *
 * ## The gap this closes, which is the fourth link of the chain
 *
 * `docs/positioning.md` records the maintainer's six links and calls them *the
 * message*. `chain.ts` holds them as data and says, for each one, where on
 * this site a visitor can watch it being true. The fourth is his
 * *Signals broadcasting to your AI model*, which this site renders as
 * **your page reports what readers do with it** — and until today the only
 * place it landed was the band on `/what-you-run` that says what *this*
 * deployment counts about the person reading.
 *
 * That band is a disclosure and it is the right band for a visitor wondering
 * what is being collected about them. It is the wrong one for the reader
 * `positioning.md` names, *"the casual web developer… junior level"*, who has
 * just been told their page will report what readers do with it and wants to
 * know **what they get**. A sentence promising data, with no data under it, is
 * the same gap *What you write* closed for the second link on 3 November: a
 * claim about something concrete, argued in prose.
 *
 * So the site prints one report. It is the data a page of the reader's own
 * would post, in the shape the runtime actually posts it.
 *
 * ## It is checked against the thing that receives it
 *
 * `reported.test.ts` parses the text below and puts it through
 * `readerSignalBatchSchema` — the same schema the ingest endpoint validates a
 * real batch with. So the report on the page is known to be **a report this
 * product would accept**, not a plausible-looking object somebody typed.
 *
 * Three further properties are held there, and each one is a way the panel
 * could go quietly wrong:
 *
 * - **Every part it names is a part of the page shown above it.** The band
 *   sits under *On a page*, which renders `example.ts`' coffee page out of the
 *   starter set, and the copy says the report came from that page. The test
 *   walks that tree and fails if the report names a type the page does not
 *   render.
 * - **It reports no press, because that page has nothing to press.**
 *   `example.ts` carries no control on purpose and says why at length. A
 *   report claiming a press against a page with no target would be the one
 *   error here that no reader could catch, so the test asks the registry
 *   whether any type on that page is interactive and holds the report to the
 *   answer.
 * - **It carries no field about a person**, which is the band's closing claim
 *   and the one a reader is entitled to check. Every key in it is pinned, so a
 *   field added upstream that named a reader would make this lane red rather
 *   than arriving on the page under a sentence saying it cannot exist.
 *
 * ## Why the text is authored and the object is derived
 *
 * The other way round is the obvious one — write a typed `ReaderSignalBatch`
 * and print `JSON.stringify(batch, null, 2)` — and it was tried first. Two
 * things are wrong with it.
 *
 * A pretty-printer puts every field of every signal on a line of its own,
 * which turns four observations into thirty-one lines of panel for a reader to
 * scan. And a value derived from the thing it describes cannot notice that
 * thing changing: `readers/asked.ts` carries the same argument for pinning
 * rather than computing, and names the two funnel mutations that passed
 * because a list was computed from its own subject.
 *
 * So the lines are a reader's, written here once, and every claim about them
 * is an assertion over the parsed value.
 *
 * ## The random key is in it rather than left out
 *
 * `view` is optional in the schema: a deployment that wants totals and no
 * funnel sends nothing there. Leaving it out would have made this panel
 * shorter and the band's last line easier to write, and it would have been the
 * wrong call twice over. The broadcaster mints one by default, so a report
 * without it is not the shape a reader would actually get; and a site arguing
 * that Loom can say what really happened does not get to drop the one field
 * that would raise a question. It is in the panel, and one sentence of the
 * band says what it is and that the page throws it away.
 */

/** What the panel is captioned with. A caption is prose and is read as prose. */
export const REPORT_CAPTION = "one report from the page above"

/** The language chip on the panel. */
export const REPORT_LANGUAGE = "json"

/**
 * One delivery from the coffee page above, exactly as it would arrive.
 *
 * Four observations, two parts, one visit. The reader can see the shape of it
 * in a glance, which is the whole reason it is four and not fourteen.
 */
export const THE_REPORT = `{
  "treeId": "t_fern1",
  "revision": 1,
  "sentAt": 1793784678000,
  "view": "9f14c0a7b65d4e2318ab7d90c4e6f512",
  "signals": [
    { "kind": "viewed", "nodeId": "n_fern1", "type": "loom.hero", "at": 1793784659240 },
    { "kind": "dwelled", "nodeId": "n_fern1", "type": "loom.hero", "ms": 7420 },
    { "kind": "viewed", "nodeId": "n_fern6", "type": "loom.feature-grid", "at": 1793784667100 },
    { "kind": "dwelled", "nodeId": "n_fern6", "type": "loom.feature-grid", "ms": 2680 }
  ]
}`

/**
 * Every field a report on this site carries, pinned.
 *
 * This is the band's closing claim stated as data: *nothing in it says who was
 * reading, because there is no field for a person.* The test holds the keys
 * found anywhere in the parsed report to exactly this list, so the day a field
 * arrives that is about a reader rather than about a part of a page, the
 * sentence and the panel cannot disagree — this lane goes red first.
 */
export const REPORT_FIELDS: readonly string[] = [
  "at",
  "kind",
  "ms",
  "nodeId",
  "revision",
  "sentAt",
  "signals",
  "treeId",
  "type",
  "view",
]
