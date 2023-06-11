/**
 * @summary App model.
 * @exports @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file ./src/models/app.js
 */

import path from 'node:path'
import { writeFile, readFile, stat } from 'node:fs/promises'
import { subtle } from 'node:crypto'
import { ulid } from 'ulid'
import { CryptoKeys } from './cryptoKeys.js'
import { _log, _error } from '../utils/logging.js'

const appLog = _log.extend('App_class')
const appError = _error.extend('App_class')
const DATABASE = process.env.MONGODB_DBNAME ?? 'koastub'
const COLLECTION = 'app'

class App {
  #cryptoKeys

  constructor(config = {}) {
    const log = appLog.extend('constructor')
    const error = appError.extend('constructor')

    this._keyDir = config.keyDir ?? './keys'
    this._db = config?.db.db().collection(COLLECTION)
    this._siteName = process.env.SITE_NAME ?? 'website'
    this._keys = config.keys ?? { signing: [], encrypting: [] }
    this.#cryptoKeys = new CryptoKeys({ dirs: { public: this._keyDir, private: this._keyDir } })
  }

  async keys() {
    const log = appLog.extend('keys')
    const error = appError.extend('keys')
    this._keys = (await this._db.findOne({ name: this._siteName }, { projection: { keys: 1 } })).keys
    let needToUpdate = false
    const numSigKeys = this._keys.signing?.length ?? 0
    const numEncKeys = this._keys.encrypting?.length ?? 0
    // log(this._keys, numSigKeys, numEncKeys)
    try {
      if (numSigKeys < 1) {
        // await this.#createRSASigningKey()
        this.#cryptoKeys = await this.#cryptoKeys.generateKey({ alg: 'RSA', use: 'sig' })
        needToUpdate = true
      }
      if (numEncKeys < 1) {
        // await this.#createRSAEncryptingKey()
        this.#cryptoKeys = await this.#cryptoKeys.generateKey({ alg: 'RSA', use: 'enc' })
        needToUpdate = true
      }
    } catch (e) {
      error('Failed to create crypto keys.')
      error(e)
      return false
    }
    if (needToUpdate) {
      const keyResults = await this.#cryptoKeys.export()
      if (keyResults.details.signing !== null) {
        // set filename and path for keys
        // save keys to file system
        const keyIndex = numSigKeys
        const filename = `app-${keyIndex}-${process.env.RSA_SIG_KEY_FILENAME}`
        const pubKeyPath = path.resolve(this._keyDir, `${filename}-public.pem`)
        const jwkeyPath = path.resolve(this._keyDir, `${filename}.jwk`)
        const priKeyPath = path.resolve(this._keyDir, `${filename}-private.pem`)
        try {
          await writeFile(pubKeyPath, keyResults.sig.public)
          keyResults.details.signing.publicKey = pubKeyPath
          log(`Saving ${pubKeyPath}`)
          await writeFile(priKeyPath, keyResults.sig.private)
          keyResults.details.signing.privateKey = priKeyPath
          log(`Saving ${priKeyPath}`)
          await writeFile(jwkeyPath, JSON.stringify(keyResults.sig.jwk))
          keyResults.details.signing.jwk = jwkeyPath
          log(`Saving ${jwkeyPath}`)
        } catch (e) {
          error('Failed to save key files.')
          error(e)
          throw new Error(e)
        }
        this._keys.signing.unshift(keyResults.details.signing)
      }
      if (keyResults.details.encrypting !== null) {
        // set filename and path for keys
        // save keys to file system
        const keyIndex = numEncKeys
        const filename = `app-${keyIndex}-${process.env.RSA_ENC_KEY_FILENAME}`
        const pubKeyPath = path.resolve(this._keyDir, `${filename}-public.pem`)
        const jwkeyPath = path.resolve(this._keyDir, `${filename}.jwk`)
        const priKeyPath = path.resolve(this._keyDir, `${filename}-private.pem`)
        try {
          await writeFile(pubKeyPath, keyResults.enc.public)
          keyResults.details.encrypting.publicKey = pubKeyPath
          log(`Saving ${pubKeyPath}`)
          await writeFile(priKeyPath, keyResults.enc.private)
          keyResults.details.encrypting.privateKey = priKeyPath
          log(`Saving ${priKeyPath}`)
          await writeFile(jwkeyPath, JSON.stringify(keyResults.enc.jwk))
          keyResults.details.encrypting.jwk = jwkeyPath
          log(`Saving ${jwkeyPath}`)
        } catch (e) {
          error('Failed to save key files.')
          error(e)
          throw new Error(e)
        }
        this._keys.encrypting.unshift(keyResults.details.encrypting)
      }
      // log('keys: ', this._keys)
      const filter = { name: this._siteName }
      const update = {
        $set: {
          keys: this._keys,
        },
      }
      const options = { writeConcern: { w: 'majority' }, upsert: false, returnDocument: 'after' }
      try {
        const result = await this._db.findOneAndUpdate(filter, update, options)
        if (result.ok !== 1) {
          throw new Error('Updating keys property failed.')
        }
        // log(result)
      } catch (e) {
        error('Failed to update db after creating new keys.')
        error(e)
        return false
      }
    }
    return this._keys
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
