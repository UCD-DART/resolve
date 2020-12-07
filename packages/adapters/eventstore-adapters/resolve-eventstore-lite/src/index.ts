import createAdapter from 'resolve-eventstore-base'
import sqlite from 'sqlite'
import tmp from 'tmp'
import os from 'os'
import fs from 'fs'

import beginIncrementalImport from './begin-incremental-import'
import commitIncrementalImport from './commit-incremental-import'
import connect from './connect'
import dispose from './dispose'
import dropSnapshot from './drop-snapshot'
import drop from './drop'
import freeze from './freeze'
import getLatestEvent from './get-latest-event'
import getSecretsManager from './secrets-manager'
import init from './init'
import injectEvent from './inject-event'
import loadEventsByCursor from './load-events-by-cursor'
import loadEventsByTimestamp from './load-events-by-timestamp'
import loadSnapshot from './load-snapshot'
import pushIncrementalImport from './push-incremental-import'
import rollbackIncrementalImport from './rollback-incremental-import'
import saveEvent from './save-event'
import saveSnapshot from './save-snapshot'
import shapeEvent from './shape-event'
import unfreeze from './unfreeze'

const wrappedCreateAdapter = createAdapter.bind(null, {
  beginIncrementalImport,
  commitIncrementalImport,
  connect,
  dispose,
  dropSnapshot,
  drop,
  freeze,
  getLatestEvent,
  getSecretsManager,
  init,
  injectEvent,
  loadEventsByCursor,
  loadEventsByTimestamp,
  loadSnapshot,
  pushIncrementalImport,
  rollbackIncrementalImport,
  saveEvent,
  saveSnapshot,
  shapeEvent,
  unfreeze,
  sqlite,
  tmp,
  os,
  fs,
})

export default wrappedCreateAdapter
