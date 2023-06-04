/**
 * @summary App model.
 * @exports @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file ./src/models/app.js
 */

import path from 'node:path'
import { subtle } from 'node:crypto'
import { ulid } from 'ulid'
import { _log, _error } from '../utils/logging.js'

const appLog = _log.extend('App_class')
const appError = _error.extend('App_class')
const DATABASE = 'mattmadethese'
const COLLECTION = 'app'

class App {
  constructor(config = {}) {
    const log = appLog.extend('constructor')
    const error = appError.extend('constructor')
    this._db = config?.db.db().collection(COLLECTION)
    this._keys = config?.keys ?? { signing: [], encrypting: [] }
    this._keyDir = config.keyDir
  }

  async keys() {
    const log = appLog.extend('keys')
    const error = appError.extend('keys')
    this._keys = await this._db.findOne({ name: 'Mattmadethese' }, { projection: { keys: 1 } })
    const numSigKeys = this._keys.signing?.length ?? 0
    log(numSigKeys)
    if (numSigKeys < 1) {
      await this.#createRSASigningKey()
    }
    return this._keys
  }

  async #createRSASigningKey() {
    const log = appLog.extend('createRSASigningKey')
    const error = appError.extend('createRSASigningKey')
    try {
      const keyIndex = this._keys.signing?.length ?? 0
      const newSigKey = await subtle.generateKey(
        {
          name: process.env.RSA_SIG_KEY_NAME ?? 'RSASSA-PKCS1-v1_5',
          modulusLength: parseInt(process.env.RSA_SIG_KEY_MOD, 10) ?? 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: process.env.RSA_SIG_KEY_HASH ?? 'SHA-256',
        },
        true,
        ['sign', 'verify'],
      )
      const kid = ulid()
      const pubKeyPath = path.resolve(this._keyDir, `app-rs256-public-${keyIndex}.pem`)
      const jwkeyPath = path.resolve(this._keyDir, `app-rs256-${keyIndex}.jwk`)
      const priKeyPath = path.resolve(this._keyDir, `app-rs256-private-${keyIndex}.pem`)
      log(kid, pubKeyPath, jwkeyPath, priKeyPath)

      // kid property value set for JWK in User.js, pretty printing
      // this._keys.signing.unshift(<new keys>)
    } catch (e) {

    }
  }

  /**
   * Rotate a new RSA key pair into use.
   * @summary Rotate a new RSA key pair into use.
   * @async
   * @return { undefined }
   */
  async rotate() {
    const log = appLog.extend('rotate')
    const error = appLog.extend('rotate')
    log('Rotating server keys.')
  }
}

export {
  App,
}
