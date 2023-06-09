/**
 * @summary Crypto keys model.
 * @exports @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file ./src/models/cryptoKesy.js
 */

import path from 'node:path'
import { subtle } from 'node:crypto'
import { ulid } from 'ulid'
import { _log, _error } from '../utils/logging.js'

const keysLog = _log.extend('Keys_class')
const keysError = _error.extend('Keys_class')
const DATABASE = process.env.MONGODB_DBNAME ?? 'koastub'
const COLLECTION = 'app'

class CryptoKeys {
  #db

  #siteName

  #keys

  #rsaEnc

  #rsaSig

  #bits

  #hash

  #curve

  #publicKeyDir

  #privateKeyDir

  _pubKey

  _priKey

  _jwk

  constructor(config) {
    const log = keysLog.extend('constructor')
    const error = keysError.extend('constructor')

    this._format = config?.format ?? 'pem'
    this._kid = ulid()
    this.#publicKeyDir = config?.dirs?.public ?? process.env.KEY_DIR ?? './keys'
    this.#privateKeyDir = config?.dirs?.private ?? process.env.KEY_DIR ?? './keys'
    this.#db = config?.db?.db().collection(COLLECTION) ?? null
    this.#siteName = process.env.SITE_NAME ?? 'website'
    this.#keys = config.keys ?? { signing: {}, encrypting: {} }
    this.#rsaEnc = process.env.RSA_ENC_KEY_NAME ?? 'RSA-OAEP'
    this.#rsaSig = process.env.RSA_SIG_KEY_NAME ?? 'RSASSA-PKCS1-v1_5'
    this.#bits = process.env.RSA_SIG_KEY_MOD ?? 2048
    this.#hash = process.env.RSA_ENC_KEY_TYPE ?? 'SHA-256'
    this.#curve = process.env.ECDSA_SIG_KEY_NAMEDCURVE ?? 'P-521'
  }

  async generateKey(o) {
    const log = keysLog.extend('generateKey')
    const error = keysError.extend('generateKey')
    const options = { use: 'sig', alg: 'RSA', ...o }
    let keys
    if (options.alg.toLowerCase() === 'rsa') {
      if (options.use === 'sig') {
        keys = await this.#signRSA()
      } else if (options.use === 'enc') {
        keys = await this.#encRSA()
      } else {
        const errorMessage = `Invalid key use: ${options.use} specified in parameters.`
        error(errorMessage)
        throw new Error(errorMessage)
      }
    } else if (options.alg.toLowerCase() === 'ecdsa') {
      keys = await this.#sigECDSA()
    } else {
      const errorMessage = 'Missing required key algorith.'
      error(errorMessage)
      throw new Error(errorMessage)
    }
    return keys
  }

  async #signRSA() {
    const log = keysLog.extend('signRSA')
    const error = keysError.extend('signRSA')
    let keys
    try {
      keys = await subtle.generateKey(
        {
          name: this.#rsaSig,
          modulusLength: this.#bits,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: this.#hash,
        },
        true,
        ['sign', 'verify'],
      )
      this._keyType = this.#rsaSig
      this._pubKey = keys.publicKey
      this._priKey = keys.privateKey
      this.#keys.signing.name = keys.publicKey.algorithm.name
      this.#keys.signing.hash = keys.publicKey.algorithm.hash.name
      this.#keys.signing.bits = keys.publicKey.algorithm.modulusLength
      this.#keys.signing.kid = this._kid
      this.#keys.signing.publicKey = ''
      this.#keys.signing.privateKey = ''
      this.#keys.signing.jwk = ''
    } catch (e) {
      error(e)
      throw new Error(e)
    }
    // return keys
    return this
  }

  async #encRSA() {
    let keys
    try {
      keys = await subtle.generateKey(
        {
          name: this.#rsaEnc,
          modulusLength: this.#bits,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: this.#hash,
        },
        true,
        ['encrypt', 'decrypt'],
      )
      this._keyType = this.#rsaEnc
      this._pubKey = keys.publicKey
      this._priKey = keys.privateKey
      this.#keys.encrypting.name = keys.publicKey.algorithm.name
      this.#keys.encrypting.hash = keys.publicKey.algorithm.hash.name
      this.#keys.encrypting.bits = keys.publicKey.algorithm.modulusLength
      this.#keys.encrypting.kid = this._kid
      this.#keys.encrypting.publicKey = ''
      this.#keys.encrypting.privateKey = ''
      this.#keys.encrypting.jwk = ''
    } catch (e) {
      throw new Error(e)
    }
    // return keys
    return this
  }

  async #sigECDSA() {
    let keys
    try {
      keys = await subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: this.#curve,
        },
        true,
        ['sign', 'verify'],
      )
      this._keyType = 'ECDSA'
      this._pubKey = keys.publicKey
      this._priKey = keys.privateKey
      this.#keys.encrypting.name = keys.publicKey.algorithm.name
      this.#keys.encrypting.namedCurve = keys.publicKey.algorithm.namedCurve
      this.#keys.encrypting.kid = this._kid
      this.#keys.encrypting.publicKey = ''
      this.#keys.encrypting.privateKey = ''
      this.#keys.encrypting.jwk = ''
    } catch (e) {
      throw new Error(e)
    }
    // return keys
    return this
  }

  get publicKeyDir() {
    return this.#publicKeyDir
  }

  set publicKeyDir(dir) {
    this.#publicKeyDir = path.resolve(dir)
  }

  get privateKeyDir() {
    return this.#privateKeyDir
  }

  set privateKeyDir(dir) {
    this.#privateKeyDir = path.resolve(dir)
  }

  get keys() {
    return this.#keys
  }
}

export {
  CryptoKeys,
}
