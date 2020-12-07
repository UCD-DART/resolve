import { AdapterPool, EventFilter } from './types'

const injectString = (pool: AdapterPool, value: string) => `${pool.escape(value)}`
const injectNumber = (pool: AdapterPool, value: number) => `${+value}`

const createQuery = (
  pool: AdapterPool,
  { eventTypes, aggregateIds, startTime, finishTime } : EventFilter
) => {
  const { escapeId } = pool

  const queryConditions = []
  if (eventTypes != null) {
    queryConditions.push(
      `${escapeId('type')} IN (${eventTypes
        .map(injectString.bind(null, pool))
        .join(', ')})`
    )
  }
  if (aggregateIds != null) {
    queryConditions.push(
      `${escapeId('aggregateId')} IN (${aggregateIds
        .map(injectString.bind(null, pool))
        .join(', ')})`
    )
  }
  if (startTime != null) {
    queryConditions.push(
      `${escapeId('timestamp')} > ${injectNumber(pool, startTime)}`
    )
  }
  if (finishTime != null) {
    queryConditions.push(
      `${escapeId('timestamp')} < ${injectNumber(pool, finishTime)}`
    )
  }

  return queryConditions.length > 0
    ? `WHERE ${queryConditions.join(' AND ')}`
    : ''
}

export default createQuery
