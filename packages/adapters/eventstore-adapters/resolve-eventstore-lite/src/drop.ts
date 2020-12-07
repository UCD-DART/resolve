import { EventstoreResourceNotExistError } from 'resolve-eventstore-base'
import getLog from './get-log'
import { AdapterPool } from './types'

const dropEventStore = async (pool: AdapterPool): Promise<any> => {
  const { database,
    eventsTableName,
    snapshotsTableName,
    escapeId,
    memoryStore,
    config
  } = pool
  const log = getLog('dropEventStore')
  try {
    log.debug(`dropping events freeze table`)
    await database.exec(
      `DROP TABLE IF EXISTS ${escapeId(`${eventsTableName}-freeze`)}`
    )

    log.debug(`dropping events primary table`)
    await database.exec(`DROP TABLE ${escapeId(eventsTableName)}`)

    log.debug(`dropping snapshots table`)
    await database.exec(`DROP TABLE ${escapeId(snapshotsTableName)}`)

    log.debug(`event store tables are dropped`)
  } catch (error) {
    if (error) {
      let errorToThrow = error
      if (/^SQLITE_ERROR: no such table.*?$/.test(error.message)) {
        errorToThrow = new EventstoreResourceNotExistError(
          `sqlite adapter for database "${config.databaseFile}" already dropped`
        )
      } else {
        log.error(errorToThrow.message)
        log.verbose(errorToThrow.stack)
      }
      throw errorToThrow
    }
  } finally {
    if (memoryStore != null) {
      try {
        await memoryStore.drop()
      } catch (e) {
        log.error(e.message)
        log.verbose(e.stack)
      }
    }
  }
}

const dropSecretsStore = async (pool: AdapterPool): Promise<any> => {
  const log = getLog('dropSecretsStore')

  log.debug(`dropping secrets store database tables`)
  const { secretsDatabase, secretsTableName, escapeId } = pool
  log.verbose(`secretsTableName: ${secretsTableName}`)

  await secretsDatabase.exec(
    `DROP TABLE IF EXISTS ${escapeId(secretsTableName)}`
  )

  log.debug(`secrets store database tables are dropped`)
}

const drop = async (pool: AdapterPool): Promise<any> => {
  const log = getLog('drop')

  log.debug(`dropping the event store`)
  await Promise.all([dropEventStore(pool), dropSecretsStore(pool)])
  log.debug(`the event store dropped`)
}

export default drop
