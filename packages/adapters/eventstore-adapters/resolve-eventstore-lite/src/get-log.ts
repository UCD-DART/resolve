import getLog from 'resolve-debug-levels'

export default (scope: string) => getLog(`resolve:event-store-sqlite:${scope}`)
