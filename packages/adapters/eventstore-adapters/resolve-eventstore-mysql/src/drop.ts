import { EventstoreResourceNotExistError } from 'resolve-eventstore-base'
import { EOL } from 'os'
import getLog from './js/get-log'
import { AdapterPool } from './types'

const dropEventStore = async ({
  events: { eventsTableName, snapshotsTableName, connection, database },
  escapeId,
}) => {
  const log = getLog('dropEventStore')

  log.debug(`dropping events tables`)

  const eventsTableNameAsId = escapeId(eventsTableName)
  const freezeTableNameAsId = escapeId(`${eventsTableName}-freeze`)
  const threadsTableNameAsId = escapeId(`${eventsTableName}-threads`)
  const snapshotsTableNameAsId = escapeId(snapshotsTableName)

  const statements = [
    `DROP TABLE IF EXISTS ${freezeTableNameAsId}`,
    `DROP TABLE ${threadsTableNameAsId}`,
    `DROP TABLE ${eventsTableNameAsId}`,
    `DROP TABLE ${snapshotsTableNameAsId}`,
  ]

  const errors = []

  for (const statement of statements) {
    try {
      await connection.execute(statement)
    } catch (error) {
      if (error != null) {
        if (/Unknown table/i.test(error.message)) {
          throw new EventstoreResourceNotExistError(
            `duplicate event store resource drop detected for database ${database}`
          )
        } else {
          log.error(error.message)
          log.verbose(error.stack)
        }
        errors.push(error)
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.stack).join(EOL))
  }
}

const dropSecretsStore = async (pool: AdapterPool): Promise<any> => {
  const log = getLog('dropSecretsStore')

  log.debug(`dropping secrets store database tables`)
  const {
    secrets: { tableName, connection },
    escapeId,
  } = pool
  log.verbose(`secretsTableName: ${tableName}`)

  await connection.execute(`DROP TABLE IF EXISTS ${escapeId(tableName)}`)

  log.debug(`secrets store database tables are dropped`)
}

const drop = async (pool: AdapterPool): Promise<any> => {
  const log = getLog('drop')

  log.debug(`dropping the event store`)
  await Promise.all([dropEventStore(pool), dropSecretsStore(pool)])
  log.debug(`the event store dropped`)
}

export default drop
