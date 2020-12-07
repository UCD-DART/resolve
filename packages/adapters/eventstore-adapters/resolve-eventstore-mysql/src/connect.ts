import getLog from './js/get-log'
import { AdapterPool, AdapterSpecific } from './types'

const connectEventStore = async (pool, { MySQL }) => {
  const log = getLog(`connectEventStore`)

  log.debug('connecting to events store database')

  const {
    eventsTableName = 'events',
    snapshotsTableName = 'snapshots',
    secretsTableName,
    snapshotBucketSize,
    database,
    ...connectionOptions
  } = pool.config

  log.verbose(`eventsTableName: ${eventsTableName}`)
  log.verbose(`snapshotsTableName: ${snapshotsTableName}`)
  log.verbose(`database: ${database}`)

  log.debug(`establishing connection`)

  void (secretsTableName, snapshotBucketSize)

  const connection = await MySQL.createConnection({
    ...connectionOptions,
    database,
    multipleStatements: true,
  })

  const [[{ version }]] = await connection.query(
    `SELECT version() AS \`version\``
  )
  const major = +version.split('.')[0]
  if (isNaN(major) || major < 8) {
    throw new Error(`Supported MySQL version 8+, but got ${version}`)
  }

  log.debug(`connected successfully`)

  Object.assign(pool, {
    events: {
      connection,
      eventsTableName,
      snapshotsTableName,
      database,
    },
  })
}

const connectSecretsStore = async (
  pool: AdapterPool,
  specific: AdapterSpecific
): Promise<void> => {
  const log = getLog('connectSecretsStore')

  log.debug('connecting to secrets store database')

  const { MySQL } = specific
  const {
    eventsTableName,
    snapshotsTableName,
    secretsTableName = 'secrets',
    secretsDatabase,
    database,
    ...connectionOptions
  } = pool.config

  // MySQL throws warning
  delete connectionOptions.snapshotBucketSize

  const actualDatabase = secretsDatabase || database

  log.verbose(`secretsDatabase: ${actualDatabase}`)
  log.verbose(`secretsTableName: ${secretsTableName}`)

  log.debug(`establishing connection`)

  const connection = await MySQL.createConnection({
    ...connectionOptions,
    database: secretsDatabase || database,
    multipleStatements: true,
  })

  log.debug(`connected successfully`)

  Object.assign(pool, {
    secrets: {
      connection,
      tableName: secretsTableName,
      database: actualDatabase,
    },
  })
}

const connect = async (
  pool: AdapterPool,
  specific: AdapterSpecific
): Promise<any> => {
  const log = getLog('connect')
  log.debug('connecting to mysql databases')

  const { escapeId, escape } = specific

  Object.assign(pool, {
    escapeId,
    escape,
  })

  await Promise.all([
    connectEventStore(pool, specific),
    connectSecretsStore(pool, specific),
  ])
  log.debug('mysql databases are connected')
}

export default connect
