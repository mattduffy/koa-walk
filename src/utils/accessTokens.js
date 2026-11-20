/**
 * @module @mattduffy/koa-glp
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary Middleware functions to create Apple MapKit access tokens.
 * @file src/utils/accessTokens.js
 */

import path from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { importPKCS8, SignJWT } from 'jose'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
// import * as mongoClient from '../daos/impl/mongodb/mongo-client.js'
import { redis } from '../daos/impl/redis/redis-client.js'
import { _log, _error } from './logging.js'

const log = _log.extend('utils:accessTokens')
const error = _error.extend('utils:accessTokens')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(`${__dirname}/../..`)
const tokensEnv = {}
log(`appRoot: ${appRoot}`)
dotenv.config({ path: path.resolve(appRoot, 'config/apple-tokens.env'), processEnv: tokensEnv })

async function requestTokenFromApple(jwt) {
  try {
    const req = new Request('https://maps-api.apple.com/v1/token', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })
    const response = await fetch(req)
    if (response.status === 200) {
      const json = await response.json()
      if (json.accessToken) {
        log('Apple json response:', json)
        return json.accessToken
      }
      if (json.error && json.error.message === 'Not Authorized') {
        const msg = `Apple says: ${json.error.message}.`
        error(msg)
        throw new Error()
      }
    }
  } catch (e) {
    error(e)
    throw new Error(e)
  }
  return false
}

/**
 * Create an access token for Apple Mapkit.
 * @summary Create an access token for Apple Mapkit.
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @param {String} s - The access token scope, either 'makkit_js' or 'server_api'.
 * @throws {Error}
 * @return {String|Boolean} - A base64 encoded JWT access token, or false if failed.
 */
async function createAccessToken(s) {
  const scope = s
  let token
  let p8
  let key
  const now = Math.floor(Date.now() / 1000)
  if (!scope) {
    const msg = 'Missing required scope parameter.'
    error(msg)
    throw new Error(msg)
  }
  try {
    log('checking redis for access jwt with scope', scope)
    token = await redis.get(`wlk:accessTokens:${scope}`)
    log('redis returned:', token)
    if (token !== null) {
      return token
    }
  } catch (e) {
    error(e)
    throw new Error(e)
  }
  if (scope === 'server_api') {
    log('Creating a mapkit server_api scoped access token.')
    let jwt
    try {
      const filepath = path.resolve(appRoot, 'keys', 'mapkit', tokensEnv.APPLE_PKCS8_KEY)
      log(`key path: ${filepath}`)
      p8 = readFileSync(filepath, 'utf-8')
      key = await importPKCS8(p8, 'ES256')
      jwt = await new SignJWT({ scope: 'server_api' })
        .setProtectedHeader(
          {
            alg: tokensEnv.MAPKIT_ALGORITHM,
            kid: tokensEnv.MAPKIT_KEY_ID,
            typ: 'JWT',
          },
        )
        .setIssuer(tokensEnv.APPLE_TEAM_ID)
        .setIssuedAt(now)
        .setExpirationTime(now + (365 * 86400))
        .sign(key)
      log('New JWT created', jwt)
    } catch (e) {
      const msg = 'Failed to create and sign jwt.'
      error(msg)
      throw new Error(msg, { cause: e })
    }
    try {
      // make http api request to apple to get access token from jwt
      token = await requestTokenFromApple(jwt)
      log('Token received from Apple', token)
    } catch (e) {
      const msg = 'Token request to Apple failed.'
      error(msg)
      throw new Error(msg, { cause: e })
    }
    try {
      log('saving new server_api access token to redis with ttl 1700.')
      await redis.set(`wlk:accessTokens:${scope}`, token, { EX: 1700 })
    } catch (e) {
      const msg = 'Failed to save new access token to redis.'
      error(msg)
      throw new Error(msg, { cause: e })
    }
    try {
      const file = path.resolve(appRoot, 'keys', 'mapkit', tokensEnv.MAPKIT_API_JWT)
      log('saving new server_api signed jwt to file:', file)
      writeFileSync(file, jwt, { encoding: 'utf-8' })
      return token
    } catch (e) {
      error(`Failed to write new mapkit access token to file ${tokensEnv.MAPKIT_API_JWT}.`)
      error(e)
      throw new Error(e)
    }
  } else if (scope === '__MapKit_JS__') {
    log('Creating a mapkit_js scoped access token.')
    log('Not really ready to use this yet.')
    log('What is the correct redis ttl to save token with?')
    log(`For now, access token scope: ${scope} is a noop.`)
    // try {
    //   p8 = readFileSync(path.resolve(appRoot, 'keys', 'mapkit', tokensEnv.APPLE_PKCS8_KEY))
    //   key = await importPKCS8(p8, 'ES256')
    //   const jwt = await new SignJWT({ scope, origin: tokensEnv.MAPKIT_ORIGIN })
    //     .setProtectedHeader(
    //       { alg: tokensEnv.MAPKIT_ALGORITHM, kid: tokensEnv.MAPKIT_KEY_ID, typ: 'JWT' },
    //     )
    //     .setIssuer(tokensEnv.APPLE_TEAM_ID)
    //     .setIssuedAt(now)
    //     .setExpirationTime(now + (365 * 86400))
    //     .sign(key)
    //   // make http api request to apple to get access token from jwt
    //   token = await requestTokenFromApple(jwt)
    //   log('saving new mapkit_js access token to redis with ttl 1700.')
    //   await redis.set(`wlk:accessTokens:${scope}`, token, { EX: 1700 })
    //   const file = path.resolve(appRoot, 'keys', 'mapkit', tokensEnv.MAPKIT_API_JWT)
    //   log('saving new server_api access token to file:', file)
    //   log(token)
    //   writeFileSync(file, token, { encoding: 'utf-8' })
    //   return token
    // } catch (e) {
    //   error('Failed to create new mapkit access token.')
    //   error(e)
    //   throw new Error(e)
    // }
  }
  log('access token scope: noop')
  return false
}

export {
  createAccessToken,
}
