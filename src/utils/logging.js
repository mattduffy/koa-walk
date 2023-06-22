/**
 * @summary A small wrapper around the Debug package to setup the namespace.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/utils/logging.js A small wrapper around the Debug package to setup the namespace.
 */

import Debug from 'debug'

Debug.log = console.log.bind(console)
const _log = Debug('koa-stub-LOG')
const _error = Debug('koa-stub-ERROR')

export {
  _log,
  _error,
}
