/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/middlewares.js A small library of useful middleware funtions.
 */

import Debug from 'debug'

Debug.log = console.log.bind(console)
const _log = Debug('koa-stub-LOG')
const _error = Debug('koa-stub-ERROR')

export {
  _log,
  _error,
}
