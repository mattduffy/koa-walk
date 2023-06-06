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
import { _log, _error } from '../utils/logging.js'

const appLog = _log.extend('App_class')
const appError = _error.extend('App_class')
const DATABASE = process.env.MONGODB_DBNAME ?? 'koastub'
const COLLECTION = 'app'

class App {
  constructor(config = {}) {
    const log = appLog.extend('constructor')
    const error = appError.extend('constructor')

    this._keyDir = config.keyDir
    this._db = config?.db.db().collection(COLLECTION)
    this._siteName = process.env.SITE_NAME ?? 'website'
    this._keys = config.keys ?? { signing: [], encrypting: [] }
  }

  async keys() {
    const log = appLog.extend('keys')
    const error = appError.extend('keys')
    this._keys = (await this._db.findOne({ name: this._siteName }, { projection: { keys: 1 } })).keys
    let needToUpdate = false
    const numSigKeys = this._keys.signing?.length ?? 0
    const numEncKeys = this._keys.encrypting?.length ?? 0
    // log(this._keys, numSigKeys, numEncKeys)
    if (numSigKeys < 1) {
      await this.#createRSASigningKey()
      needToUpdate = true
    }
    if (numEncKeys < 1) {
      await this.#createRSAEncryptingKey()
      needToUpdate = true
    }
    if (needToUpdate) {
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

  async #createRSAEncryptingKey() {
    const log = appLog.extend('createRSAEncryptingKey')
    const error = appError.extend('createRSAEncryptingKey')
    const keyIndex = this._keys.encrypting?.length ?? 0
    let keys
    const name = process.env.RSA_ENC_KEY_NAME ?? 'RSA-OAEP'
    const bits = parseInt(process.env.RSA_ENC_KEY_MOD, 10) ?? 2048
    const hash = process.env.RSA_ENC_KEY_HASH ?? 'SHA-256'
    try {
      keys = await subtle.generateKey(
        {
          name,
          modulusLength: bits,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash,
        },
        true,
        ['encrypt', 'decrypt'],
      )
    } catch (e) {
      error('Failed to generate RSA OAEP Encrypting keys')
      error(e)
      return false
    }
    const filename = `app-${keyIndex}-${process.env.RSA_ENC_KEY_FILENAME}`
    const pubKeyPath = path.resolve(this._keyDir, `${filename}-public.pem`)
    const jwkeyPath = path.resolve(this._keyDir, `${filename}.jwk`)
    const priKeyPath = path.resolve(this._keyDir, `${filename}-private.pem`)
    const kid = ulid()
    // log(kid, pubKeyPath, jwkeyPath, priKeyPath)
    let pub
    let jwk
    let pri
    try {
      pub = await subtle.exportKey('spki', keys.publicKey)
      pri = await subtle.exportKey('pkcs8', keys.privateKey)
      jwk = await subtle.exportKey('jwk', keys.publicKey)
      jwk.kid = kid
      jwk.use = 'enc'
    } catch (e) {
      error('Failed to export encrypting key parts')
      error(e)
      return false
    }
    let pubToPem = Buffer.from(String.fromCharCode(...new Uint8Array(pub)), 'binary').toString('base64')
    pubToPem = pubToPem.match(/.{1,64}/g).join('\n')
    pubToPem = '-----BEGIN PUBLIC KEY-----\n'
      + `${pubToPem}\n`
      + '-----END PUBLIC KEY-----'
    let priToPem = Buffer.from(String.fromCharCode(...new Uint8Array(pri)), 'binary').toString('base64')
    priToPem = priToPem.match(/.{1,64}/g).join('\n')
    priToPem = '-----BEGIN PRIVATE KEY-----\n'
      + `${priToPem}\n`
      + '-----BEGIN PRIVATE KEY-----'
    try {
      log(`Saving ${pubKeyPath}`)
      await writeFile(pubKeyPath, pubToPem)
      log(`Saving ${priKeyPath}`)
      await writeFile(priKeyPath, priToPem)
      log(`Saving ${jwkeyPath}`)
      await writeFile(jwkeyPath, JSON.stringify(jwk))
    } catch (e) {
      error('Failed to save key files.')
      error(e)
      return false
    }
    const result = {
      name,
      hash,
      bits,
      kid,
      publicKey: pubKeyPath,
      privateKey: priKeyPath,
      jwk: jwkeyPath,
    }
    this._keys.encrypting.unshift(result)
    return result
  }

  async #createRSASigningKey() {
    const log = appLog.extend('createRSASigningKey')
    const error = appError.extend('createRSASigningKey')
    const keyIndex = this._keys.signing?.length ?? 0
    let keys
    const name = process.env.RSA_SIG_KEY_NAME ?? 'RSASSA-PKCS1-v1_5'
    const bits = parseInt(process.env.RSA_SIG_KEY_MOD, 10) ?? 2048
    const hash = process.env.RSA_SIG_KEY_HASH ?? 'SHA-256'
    try {
      keys = await subtle.generateKey(
        {
          name,
          modulusLength: bits,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash,
        },
        true,
        ['sign', 'verify'],
      )
    } catch (e) {
      error('Failed to generate RSA Signing keys.')
      error(e)
      return false
    }
    const filename = `app-${keyIndex}-${process.env.RSA_SIG_KEY_FILENAME}`
    const pubKeyPath = path.resolve(this._keyDir, `${filename}-public.pem`)
    const jwkeyPath = path.resolve(this._keyDir, `${filename}.jwk`)
    const priKeyPath = path.resolve(this._keyDir, `${filename}-private.pem`)
    const kid = ulid()
    // log(kid, pubKeyPath, jwkeyPath, priKeyPath)
    let pub
    let jwk
    let pri
    try {
      pub = await subtle.exportKey('spki', keys.publicKey)
      pri = await subtle.exportKey('pkcs8', keys.privateKey)
      jwk = await subtle.exportKey('jwk', keys.publicKey)
      jwk.kid = kid
      jwk.use = 'sig'
      keys.jwk = jwk
    } catch (e) {
      error('Failed to export the signing key parts.')
      error(e)
      return false
    }
    let pubToPem = Buffer.from(String.fromCharCode(...new Uint8Array(pub)), 'binary').toString('base64')
    pubToPem = pubToPem.match(/.{1,64}/g).join('\n')
    pubToPem = '-----BEGIN PUBLIC KEY-----\n'
      + `${pubToPem}\n`
      + '-----END PUBLIC KEY-----'
    let priToPem = Buffer.from(String.fromCharCode(...new Uint8Array(pri)), 'binary').toString('base64')
    priToPem = priToPem.match(/.{1,64}/g).join('\n')
    priToPem = '-----BEGIN PRIVATE KEY-----\n'
      + `${priToPem}\n`
      + '-----BEGIN PRIVATE KEY-----'
    try {
      log(`Saving ${pubKeyPath}`)
      await writeFile(pubKeyPath, pubToPem)
      log(`Saving ${priKeyPath}`)
      await writeFile(priKeyPath, priToPem)
      log(`Saving ${jwkeyPath}`)
      await writeFile(jwkeyPath, JSON.stringify(jwk))
    } catch (e) {
      error('Failed to save key files.')
      error(e)
      return false
    }
    const result = {
      name,
      hash,
      bits,
      kid,
      publicKey: pubKeyPath,
      privateKey: priKeyPath,
      jwk: jwkeyPath,
    }
    this._keys.signing.unshift(result)
    return result
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
