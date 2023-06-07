/**
 * @summary Crypto keys model.
 * @exports @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file ./src/models/cryptoKesy.js
 */


import { subtle } from 'node:crypto'
import { ulid } from 'ulid'
import { _log, _error } from '../utils/logging.js'

const keysLog = _log.extend('Keys_class')
const keysError = _error.extend('Keys_class')
const DATABASE = process.env.MONGODB_DBNAME ?? 'koastub'
const COLLECTION = 'app'

class CryptoKeys {
  constructor(config = {}) {
    const log = keysLog.extend('constructor')
    const error = keysError.extend('constructor')

    this._keyDir = config.keyDir
    this._db = config?.db.db().collection(COLLECTION)
    this._siteName = process.env.SITE_NAME ?? 'website'
    this._keys = config.keys ?? { signing: [], encrypting: [] }
  }

  async generateKey(config = { use: 'sig', alg: 'RSA' }) {
    const log = keysLog.extend('generateKey')
    const error = keysError.extend('generateKey')
    let keys
    if (config.alg.toLowerCase() === 'rsa') {
      if (config.use === 'sig') {
        keys = await this.#signRSA()
      } else if (config.use === 'enc') {
        keys = await this.#encRSA()
      } else {
        const errorMessage = `Invalid key use: ${config.use} specified in parameters.`
        error(errorMessage)
        throw new Error(errorMessage)
      }
    } else if (config.alg.toLowerCase() === 'ecdsa') {
      const errorMessage = 'ECDSA keys no implemented yet.'
      error(errorMessage)
      throw new Error(errorMessage)
    } else {
      const errorMessage = 'Missing required key algorith.'
      error(errorMessage)
      throw new Error(errorMessage)
    }
    return keys
  }
  
  async #signRSA() {
    
  }

  async #encRSA() {

  }
}

export {
  CryptoKeys,
}
