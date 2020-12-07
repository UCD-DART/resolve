import getLog from './get-log'
import { AdapterPool, AdapterSpecific, MemoryStore } from './types'

const SQLITE_BUSY = 'SQLITE_BUSY'
const randRange = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

const fullJitter = (retries: number): number =>
  randRange(0, Math.min(100, 2 * 2 ** retries))

const coerceEmptyString = (obj:any): string =>
  (obj != null && obj.constructor !== String) || obj == null ? 'default' : obj

const connectEventStore = async (
  pool: AdapterPool,
  specific: AdapterSpecific
) => {
  const { sqlite, tmp, os, fs } = specific
  const log = getLog('connectEventStore')

  log.debug(`connecting to events database`)
  const { escape } = pool
  let {
    databaseFile,
    eventsTableName = 'events',
    snapshotsTableName = 'snapshots',
    ...initOptions
  } = pool.config

  databaseFile = coerceEmptyString(databaseFile)
  eventsTableName = coerceEmptyString(eventsTableName)
  snapshotsTableName = coerceEmptyString(snapshotsTableName)

  log.verbose(`databaseFile: ${databaseFile}`)
  log.verbose(`eventsTableName: ${eventsTableName}`)
  log.verbose(`snapshotsTableName: ${snapshotsTableName}`)

  let connector
  if (databaseFile === ':memory:') {
    log.debug(`using memory connector`)
    if (process.env.RESOLVE_LAUNCH_ID != null) {
      const tmpName = `${os.tmpdir()}/storage-${+process.env
        .RESOLVE_LAUNCH_ID}.db`
      const removeCallback = () => {
        if (fs.existsSync(tmpName)) {
          fs.unlinkSync(tmpName)
        }
      }

      if (!fs.existsSync(tmpName)) {
        fs.writeFileSync(tmpName, '')
        process.on('SIGINT', removeCallback)
        process.on('SIGTERM', removeCallback)
        process.on('beforeExit', removeCallback)
        process.on('exit', removeCallback)
      }

      pool.memoryStore = {
        name: tmpName,
        drop: removeCallback,
      }
    } else {
      const temporaryFile = tmp.fileSync()
      pool.memoryStore = {
        name: temporaryFile.name,
        drop: temporaryFile.removeCallback.bind(temporaryFile),
      }
    }

    connector = sqlite.open.bind(sqlite, pool.memoryStore.name)
  } else {
    log.debug(`using disk file connector`)
    connector = sqlite.open.bind(sqlite, databaseFile)
  }

  log.debug(`connecting`)
  const database = await connector()

  log.debug(`adjusting connection`)

  log.verbose(`PRAGMA busy_timeout=1000000`)
  await database.exec(`PRAGMA busy_timeout=1000000`)

  log.verbose(`PRAGMA encoding=${escape('UTF-8')}`)
  await database.exec(`PRAGMA encoding=${escape('UTF-8')}`)

  log.verbose(`PRAGMA synchronous=EXTRA`)
  await database.exec(`PRAGMA synchronous=EXTRA`)

  if (databaseFile === ':memory:') {
    log.verbose(`PRAGMA journal_mode=MEMORY`)
    await database.exec(`PRAGMA journal_mode=MEMORY`)
  } else {
    log.verbose(`PRAGMA journal_mode=DELETE`)
    await database.exec(`PRAGMA journal_mode=DELETE`)
  }

  Object.assign(pool, {
    database,
    eventsTableName,
    snapshotsTableName,
    initOptions,
  })

  log.debug(`events store database connected successfully`)
}

const connectSecretsStore = async (
  pool: AdapterPool,
  specific: AdapterSpecific
): Promise<void> => {
  const log = getLog('connectSecretsStore')

  log.debug('connecting to secrets store database')

  const {
    escape,
    config: { secretsTableName = 'default', secretsFile = 'secrets.db' },
  } = pool

  log.verbose(`secretsTableName: ${secretsTableName}`)
  log.verbose(`secretsFile: ${secretsFile}`)

  for (let retry = 0; ; retry++) {
    try {
      const secretsDatabase = await specific.sqlite.open(secretsFile)

      log.debug('adjusting connection')
      await secretsDatabase.exec(`PRAGMA busy_timeout=1000000`)
      await secretsDatabase.exec(`PRAGMA encoding=${escape('UTF-8')}`)
      await secretsDatabase.exec(`PRAGMA synchronous=EXTRA`)
      await secretsDatabase.exec(`PRAGMA journal_mode=DELETE`)

      Object.assign(pool, {
        secretsDatabase,
        secretsTableName,
      })

      log.debug('secrets store database connected successfully')
      return
    } catch (error) {
      if (error && error.code === SQLITE_BUSY) {
        log.warn(`received SQLITE_BUSY error code, retrying`)
        await new Promise((resolve) => setTimeout(resolve, fullJitter(retry)))
      } else {
        log.error(error.message)
        log.verbose(error.stack)
        throw error
      }
    }
  }
}

const connect = async (
  pool: AdapterPool,
  specific: AdapterSpecific
): Promise<any> => {
  const log = getLog('connect')
  log.debug('connecting to sqlite databases')

  const escapeId = (str: string): string =>
    `"${String(str).replace(/(["])/gi, '$1$1')}"`
  const escape = (str: string): string =>
    `'${String(str).replace(/(['])/gi, '$1$1')}'`

  Object.assign(pool, {
    escapeId,
    escape,
  })

  await Promise.all([
    connectEventStore(pool, specific),
    connectSecretsStore(pool, specific),
  ])
  log.debug('connection to sqlite databases established')
}

export default connect
