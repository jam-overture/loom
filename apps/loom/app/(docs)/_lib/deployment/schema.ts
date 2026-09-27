import { HOLD_STORE_DDL, TREE_STORE_DDL } from "@jam-overture/loom/postgres"
import { TELEMETRY_DDL } from "@jam-overture/loom/telemetry/postgres"

/**
 * What a deployment's database ends up holding, read from the statements that
 * create it.
 *
 * The runtime ships its schema as lists of SQL a host runs — `TREE_STORE_DDL`,
 * `HOLD_STORE_DDL`, `TELEMETRY_DDL` — and those lists are the only description
 * of these tables that cannot be wrong, because they are what Postgres is
 * handed. A page that typed the columns out beside them would be a second copy
 * of the schema, and the copy on a documentation site is the one that goes
 * stale: nothing fails when a column is added and nobody edits the prose.
 *
 * So the columns on the page are parsed out of the statements themselves. A
 * column that arrives in the runtime appears here in the same commit, and one
 * that is renamed cannot be described under its old name.
 *
 * **An unrecognised statement throws rather than being skipped.** The failure
 * this exists to prevent is a page that quietly stops mentioning something the
 * runtime does to a host's database — so a kind of statement this parser has
 * never seen takes the build down, where somebody is looking, instead of
 * shortening a table nobody re-reads.
 */

export type SchemaColumn = {
  readonly name: string
  /** The Postgres type, exactly as the statement writes it. */
  readonly type: string
  /** `NOT NULL`, or part of the primary key, which implies it. */
  readonly required: boolean
  /** Part of the primary key — the thing a row is found by. */
  readonly key: boolean
  /**
   * Added by an `ALTER TABLE … ADD COLUMN` rather than by the `CREATE TABLE`.
   *
   * Worth surfacing rather than flattening away: `CREATE TABLE IF NOT EXISTS`
   * leaves an existing table alone, columns and all, so these are precisely the
   * columns a database created before them will not have until the migration is
   * run again.
   */
  readonly addedLater: boolean
}

export type SchemaIndex = {
  readonly name: string
  readonly columns: readonly string[]
}

export type SchemaTable = {
  readonly name: string
  readonly columns: readonly SchemaColumn[]
  readonly indexes: readonly SchemaIndex[]
  /** Whether the statements switch row level security on as the table is made. */
  readonly rowLevelSecurity: boolean
}

const CREATE_TABLE = /^CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*)\)$/
const ADD_COLUMN = /^ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+) (\w+)$/
const ENABLE_ROW_SECURITY = /^ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY$/
const CREATE_INDEX = /^CREATE INDEX IF NOT EXISTS (\w+) ON (\w+) \(([^)]*)\)$/
const PRIMARY_KEY_CONSTRAINT = /^PRIMARY KEY \(([^)]*)\)$/

/** Everything between the outer brackets, one entry per top-level comma. */
const definitionsIn = (body: string): readonly string[] => {
  const entries: string[] = []
  let depth = 0
  let current = ""

  for (const character of body) {
    if (character === "(") depth += 1
    if (character === ")") depth -= 1

    if (character === "," && depth === 0) {
      entries.push(current)
      current = ""
      continue
    }

    current += character
  }

  entries.push(current)

  return entries.map((entry) => entry.trim().replace(/\s+/g, " ")).filter((entry) => entry !== "")
}

const columnFrom = (definition: string): SchemaColumn => {
  const [name, type, ...rest] = definition.split(" ")

  if (name === undefined || type === undefined) {
    throw new Error(`loom: cannot read a column out of "${definition}"`)
  }

  const modifiers = rest.join(" ").toUpperCase()
  const key = modifiers.includes("PRIMARY KEY")

  return {
    name,
    type,
    required: key || modifiers.includes("NOT NULL"),
    key,
    addedLater: false,
  }
}

const withKeyColumns = (columns: readonly SchemaColumn[], named: readonly string[]): readonly SchemaColumn[] =>
  columns.map((column) =>
    named.includes(column.name) ? { ...column, key: true, required: true } : column
  )

const tableFrom = (name: string, body: string): SchemaTable => {
  const definitions = definitionsIn(body)
  const constraint = definitions.find((definition) => PRIMARY_KEY_CONSTRAINT.test(definition))
  const columns = definitions
    .filter((definition) => definition !== constraint)
    .map((definition) => columnFrom(definition))

  const named = constraint?.match(PRIMARY_KEY_CONSTRAINT)?.[1]?.split(",").map((part) => part.trim())

  return {
    name,
    columns: named === undefined ? columns : withKeyColumns(columns, named),
    indexes: [],
    rowLevelSecurity: false,
  }
}

/**
 * A column an `ALTER TABLE … ADD COLUMN` names, folded in rather than appended.
 *
 * The runtime writes both statements for the same column on purpose: the
 * `CREATE TABLE` is what a new database gets, and the `ALTER` is the only way
 * the column reaches one that already exists, because `CREATE TABLE IF NOT
 * EXISTS` leaves an existing table alone, columns and all. They are one column,
 * and a page that listed it twice would be describing a table Postgres never
 * makes.
 *
 * What is worth keeping from the second statement is the flag: this is a column
 * a deployment created before it will not have until the migration is run
 * again.
 */
const withAddedColumn = (
  columns: readonly SchemaColumn[],
  name: string,
  type: string
): readonly SchemaColumn[] =>
  columns.some((column) => column.name === name)
    ? columns.map((column) => (column.name === name ? { ...column, addedLater: true } : column))
    : [...columns, { name, type, required: false, key: false, addedLater: true }]

const requireTable = (
  tables: readonly SchemaTable[],
  name: string,
  statement: string
): SchemaTable => {
  const table = tables.find((candidate) => candidate.name === name)

  if (table === undefined) {
    throw new Error(`loom: "${statement}" changes ${name}, which these statements do not create`)
  }

  return table
}

const replacing = (
  tables: readonly SchemaTable[],
  updated: SchemaTable
): readonly SchemaTable[] =>
  tables.map((table) => (table.name === updated.name ? updated : table))

/**
 * The tables one list of statements leaves behind, in the order it creates
 * them.
 *
 * Every statement has to be one of the four kinds the runtime writes. An
 * `ALTER` or an index naming a table that is created elsewhere throws too: a
 * group of statements describes one deployable piece, and one that reached into
 * another's table would make this page's grouping a fiction.
 */
export const tablesIn = (ddl: readonly string[]): readonly SchemaTable[] => {
  let tables: readonly SchemaTable[] = []

  for (const raw of ddl) {
    const statement = raw.trim()

    const created = statement.match(CREATE_TABLE)
    if (created?.[1] !== undefined && created[2] !== undefined) {
      tables = [...tables, tableFrom(created[1], created[2])]
      continue
    }

    const added = statement.match(ADD_COLUMN)
    if (added?.[1] !== undefined && added[2] !== undefined && added[3] !== undefined) {
      const table = requireTable(tables, added[1], statement)

      tables = replacing(tables, {
        ...table,
        columns: withAddedColumn(table.columns, added[2], added[3]),
      })
      continue
    }

    const indexed = statement.match(CREATE_INDEX)
    if (indexed?.[1] !== undefined && indexed[2] !== undefined && indexed[3] !== undefined) {
      const table = requireTable(tables, indexed[2], statement)
      const index: SchemaIndex = {
        name: indexed[1],
        columns: indexed[3].split(",").map((column) => column.trim()),
      }

      tables = replacing(tables, { ...table, indexes: [...table.indexes, index] })
      continue
    }

    const locked = statement.match(ENABLE_ROW_SECURITY)
    if (locked?.[1] !== undefined) {
      const table = requireTable(tables, locked[1], statement)

      tables = replacing(tables, { ...table, rowLevelSecurity: true })
      continue
    }

    throw new Error(`loom: this page does not know what "${statement}" does`)
  }

  return tables
}

/**
 * The three places a deployment keeps state, and what it is like to go without
 * each one.
 *
 * The prose is written; the tables are read from the runtime. That split is the
 * whole design of this file — a sentence about *why* you would want the hold
 * store is a judgement nobody can derive, and a list of its columns is a fact
 * nobody should type.
 */
export type StorageSeam = {
  readonly id: string
  readonly title: string
  /** What it keeps, in a sentence a reader could repeat. */
  readonly keeps: string
  /** What a deployment without it loses, said as a consequence rather than a warning. */
  readonly without: string
  /** The import the Postgres half comes from. */
  readonly specifier: string
  /** The one call that creates its tables. */
  readonly ensure: string
  readonly postgres: string
  readonly memory: string
  /** The import the in-memory half comes from. */
  readonly memorySpecifier: string
  readonly tables: readonly SchemaTable[]
}

export const storageSeams: readonly StorageSeam[] = [
  {
    id: "trees",
    title: "The pages, and the log of how they got that way",
    keeps:
      "Every page you have, plus the ordered list of changes that produced each one.",
    without:
      "A change applies, the screen updates, and the page is back as it was on the next request.",
    specifier: "@jam-overture/loom/postgres",
    ensure: "ensureTreeStoreSchema",
    postgres: "postgresTreeStore",
    memory: "memoryTreeStore",
    memorySpecifier: "@jam-overture/loom/store",
    tables: tablesIn(TREE_STORE_DDL),
  },
  {
    id: "holds",
    title: "The changes waiting for a person",
    keeps:
      "A change the Gate would not wave through, kept intact until somebody answers it.",
    without:
      "A change that needs an answer is gone before the answer arrives, unless one server process handles both requests.",
    specifier: "@jam-overture/loom/postgres",
    ensure: "ensureHoldStoreSchema",
    postgres: "postgresHoldStore",
    memory: "memoryHoldStore",
    memorySpecifier: "@jam-overture/loom/write",
    tables: tablesIn(HOLD_STORE_DDL),
  },
  {
    id: "telemetry",
    title: "The account of what happened",
    keeps:
      "What was asked for, what was planned, what was decided and how it ended — including the asks that changed nothing.",
    without:
      "You can still see what your pages are; you cannot see what anybody tried to do to them.",
    specifier: "@jam-overture/loom/telemetry/postgres",
    ensure: "ensureTelemetrySchema",
    postgres: "postgresTelemetryJournal",
    memory: "memoryTelemetryJournal",
    memorySpecifier: "@jam-overture/loom/telemetry",
    tables: tablesIn(TELEMETRY_DDL),
  },
]

/** Every table a deployment that takes all three ends up with. */
export const storageTables: readonly SchemaTable[] = storageSeams.flatMap((seam) => seam.tables)
