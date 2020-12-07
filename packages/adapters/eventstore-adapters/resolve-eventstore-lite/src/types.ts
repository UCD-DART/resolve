import type { open } from 'sqlite'
export type SqliteOpen = typeof open

export type MemoryStore = {
  name: string
  drop: () => void
}

export type EventFilter = {
  eventTypes: Array<string> | null,
  aggregateIds: Array<string> | null,
  startTime: number,
  finishTime: number
}

export type AdapterPool = {
  config: {
    databaseFile: string
    secretsFile: string
    secretsTableName: string
    eventsTableName: string
    snapshotsTableName: string
  }
  secretsDatabase: any
  database: any
  eventsTableName: string
  snapshotsTableName: string
  secretsTableName: string
  escapeId: (source: string) => string
  escape: (source: string) => string
  memoryStore: MemoryStore
  shapeEvent: (event: any) => any
}

export type AdapterSpecific = {
  sqlite: { open: SqliteOpen }
  tmp: any
  os: any
  fs: any
}
