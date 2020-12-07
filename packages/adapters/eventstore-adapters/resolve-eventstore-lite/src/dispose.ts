import getLog from './get-log'
import { AdapterPool } from './types'

const disposeEventStore = async (pool: AdapterPool): Promise<any> => {
  const { database } = pool
  await database.close()
}

const disposeSecretsStore = (pool: AdapterPool): Promise<any> => {
  const { secretsDatabase } = pool
  return secretsDatabase.close()
}

const dispose = async (pool: AdapterPool): Promise<any> => {
  const log = getLog('dispose')

  log.debug(`disposing the event store`)
  await Promise.all([disposeEventStore(pool), disposeSecretsStore(pool)])
  log.debug(`the event store disposed`)
}

export default dispose
