import { EventstoreResourceAlreadyExistError } from 'resolve-eventstore-base'
import getLog from './js/get-log'
import { AdapterPool } from './types'
import {
  longNumberSqlType,
  longStringSqlType,
  customObjectSqlType,
  mediumBlobSqlType,
  longBlobSqlType,
  aggregateIdSqlType,
} from './js/constants'

const initEventStore = async ({
  events: { eventsTableName, snapshotsTableName, connection, database },
  escapeId,
}) => {
  const log = getLog('initEventStore')

  log.debug(`initializing events database tables`)

  const eventsTableNameAsId = escapeId(eventsTableName)
  const threadsTableNameAsId = escapeId(`${eventsTableName}-threads`)
  const snapshotsTableNameAsId = escapeId(snapshotsTableName)

  log.debug(`building a query`)
  const query = `CREATE TABLE ${eventsTableNameAsId}(
        \`threadId\` ${longNumberSqlType},
        \`threadCounter\` ${longNumberSqlType},
        \`timestamp\` ${longNumberSqlType},
        \`aggregateId\` ${aggregateIdSqlType},
        \`aggregateVersion\` ${longNumberSqlType},
        \`type\` ${longStringSqlType},
        \`payload\` ${customObjectSqlType},
        PRIMARY KEY(\`threadId\`, \`threadCounter\`),
        UNIQUE KEY \`aggregate\`(\`aggregateId\`, \`aggregateVersion\`),
        INDEX USING BTREE(\`aggregateId\`),
        INDEX USING BTREE(\`aggregateVersion\`),
        INDEX USING BTREE(\`type\`),
        INDEX USING BTREE(\`timestamp\`)
      );
      
      CREATE TABLE ${threadsTableNameAsId}(
        \`threadId\` ${longNumberSqlType},
        \`threadCounter\` ${longNumberSqlType},
        PRIMARY KEY(\`threadId\`)
      );
      
      CREATE TABLE ${snapshotsTableNameAsId} (
        \`SnapshotKey\` ${mediumBlobSqlType},
        \`SnapshotContent\` ${longBlobSqlType},
        PRIMARY KEY(\`SnapshotKey\`(255))
      );
  
      INSERT INTO ${threadsTableNameAsId}(
        \`threadId\`,
        \`threadCounter\`
      ) VALUES ${Array.from(new Array(256))
        .map((_, index) => `(${index}, 0)`)
        .join(',')}
      ;`

  try {
    log.debug(`executing query`)
    log.verbose(query)
    await connection.query(query)
    log.debug(`query executed successfully`)
  } catch (error) {
    if (error) {
      let errorToThrow = error
      if (/Table.*? already exists$/i.test(error.message)) {
        errorToThrow = new EventstoreResourceAlreadyExistError(
          `duplicate initialization of the mysql adapter with same events database "${database}" and table "${eventsTableName}" not allowed`
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
  const {
    secrets: { database, tableName, connection },
    escapeId,
  } = pool
  const log = getLog('initSecretsStore')

  log.verbose(`tableName: ${tableName}`)
  log.verbose(`database: ${database}`)

  log.debug(`initializing secrets store database tables`)

  const secretsTableNameAsId = escapeId(tableName)

  log.debug(`building a query`)

  const query = `CREATE TABLE ${secretsTableNameAsId}(
        \`idx\` ${longNumberSqlType},
        \`id\` ${aggregateIdSqlType},
        \`secret\` ${longStringSqlType},
        PRIMARY KEY(\`id\`, \`idx\`)
      );`

  try {
    log.debug(`executing query`)
    log.verbose(query)
    await connection.query(query)
    log.debug(`query executed successfully`)
  } catch (error) {
    if (error) {
      let errorToThrow = error
      if (/Table.*? already exists$/i.test(error.message)) {
        errorToThrow = new EventstoreResourceAlreadyExistError(
          `duplicate initialization of the mysql adapter with same secrets database "${database}" and table "${tableName}" not allowed`
        )
      } else {
        log.error(errorToThrow.message)
        log.verbose(errorToThrow.stack)
      }
      throw errorToThrow
    }
  }
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
