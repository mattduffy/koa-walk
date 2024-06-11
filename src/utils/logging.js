/**
 * @summary A small wrapper around the Debug package to setup the namespace.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/utils/logging.js A small wrapper around the Debug package to setup the namespace.
 */

import Debug from 'debug'

const { pid } = process
Debug.log = console.log.bind(console)
const _log = Debug(`${pid}-koa-stub-LOG`)
const _info = Debug(`${pid}-koa-stub-INFO`)
const _error = Debug(`${pid}-koa-stub-ERROR`)

/* eslint-disable no-extend-native */
/* eslint-disable-next-line func-names */
String.prototype.toProperCase = function () {
  return this.replace(/\w*/, (x) => x.charAt(0).toUpperCase() + x.substr(1).toLowerCase())
}
/* eslint-enable no-extend-native */

/*
 * Capitalize a word
 */
function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase()
}

export {
  _log,
  _info,
  _error,
  capitalize,
}
