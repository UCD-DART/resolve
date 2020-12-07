import { EventstoreResourceAlreadyExistError } from 'resolve-eventstore-base'
import { AGGREGATE_ID_SQL_TYPE } from './constants'
import getLog from './get-log'
import { AdapterPool } from './types'

const initEventStore = async (pool: AdapterPool): Promise<any> => {
  const {
    database,
    eventsTableName,
    snapshotsTableName,
    escapeId,
    config,
  } = pool
  const log = getLog('initEventStore')

  log.debug(`initializing events database tables`)
  log.verbose(`database: ${database}`)
  log.verbose(`eventsTableName: ${eventsTableName}`)

  try {
    await database.exec(
      `CREATE TABLE ${escapeId(eventsTableName)}(
        ${escapeId('threadId')} BIGINT NOT NULL,
        ${escapeId('threadCounter')} BIGINT NOT NULL,
        ${escapeId('timestamp')} BIGINT NOT NULL,
        ${escapeId('aggregateId')} ${AGGREGATE_ID_SQL_TYPE} NOT NULL,
        ${escapeId('aggregateVersion')} BIGINT NOT NULL,
        ${escapeId('type')} VARCHAR(700) NOT NULL,
        ${escapeId('payload')} JSON NULL,
        PRIMARY KEY(${escapeId('threadId')}, ${escapeId('threadCounter')}),
        UNIQUE(${escapeId('aggregateId')}, ${escapeId('aggregateVersion')})
      );
      CREATE INDEX ${escapeId('aggregateIdAndVersion-idx')} ON ${escapeId(
        eventsTableName
      )}(
        ${escapeId('aggregateId')}, ${escapeId('aggregateVersion')}
      );
      CREATE INDEX ${escapeId('aggregateId-idx')} ON ${escapeId(
        eventsTableName
      )}(
        ${escapeId('aggregateId')}
      );
      CREATE INDEX ${escapeId('aggregateVersion-idx')} ON ${escapeId(
        eventsTableName
      )}(
        ${escapeId('aggregateVersion')}
      );
      CREATE INDEX ${escapeId('type-idx')} ON ${escapeId(eventsTableName)}(
        ${escapeId('type')}
      );
      CREATE INDEX ${escapeId('timestamp-idx')} ON ${escapeId(eventsTableName)}(
        ${escapeId('timestamp')}
      )
      `
    )
    log.debug(`events database tables are initialized`)

    await database.exec(
      `CREATE TABLE ${escapeId(snapshotsTableName)} (
        ${escapeId('snapshotKey')} TEXT,
        ${escapeId('content')} TEXT,
        PRIMARY KEY(${escapeId('snapshotKey')})
        )`
    )
    log.debug(`snapshots database tables are initialized`)
  } catch (error) {
    if (error) {
      let errorToThrow = error
      if (/^SQLITE_ERROR:.*? already exists$/.test(error.message)) {
        errorToThrow = new EventstoreResourceAlreadyExistError(
          `duplicate initialization of the sqlite adapter with same file "${config.databaseFile}" not allowed`
        )
      } else {
        log.error(errorToThrow.message)
        log.verbose(errorToThrow.stack)
      }
      throw errorToThrow
    }
  }
}

const initSecretsStore = async (pool: AdapterPool): Promise<any> => {
  const { secretsDatabase, secretsTableName, escapeId } = pool
  const log = getLog('initSecretsStore')

  log.debug(`initializing secrets store database tables`)
  log.verbose(`secretsTableName: ${secretsTableName}`)
  await secretsDatabase.exec(`CREATE TABLE IF NOT EXISTS ${escapeId(
    secretsTableName
  )} (
        ${escapeId('idx')} BIG INT NOT NULL,
        ${escapeId('id')} ${AGGREGATE_ID_SQL_TYPE} NOT NULL,
        ${escapeId('secret')} text,
        PRIMARY KEY(${escapeId('id')}, ${escapeId('idx')})
      )`)
  log.debug(`secrets store database tables are initialized`)
}

const init = async (pool: AdapterPool): Promise<any> => {
  const log = getLog('init')
  log.debug('initializing databases')
  const result = await Promise.all([
    initEventStore(pool),
    initSecretsStore(pool),
  ])
  log.debug('databases are initialized')
  return result
}

export default init
