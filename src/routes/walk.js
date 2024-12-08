/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/walk.js The router for the top level app URLs.
 */

import Router from '@koa/router'
import { ulid } from 'ulid'
// import { ObjectId } from 'mongodb'
// import { Users } from '../models/users.js'
import { _log, _error } from '../utils/logging.js'
// import { redis } from '../daos/impl/redis/redis-client.js'
import {
  addIpToSession,
  // doTokensMatch,
  // processFormData,
  hasFlash,
} from './middlewares.js'

const walkLog = _log.extend('walk')
const walkError = _error.extend('walk')
/* eslint-disable-next-line no-unused-vars */
function sanitize(param) {
  // fill in with some effective input scubbing logic
  if (!param) walkError('missing param')
  return param
}
const router = new Router()

router.get('index', '/', addIpToSession, hasFlash, async (ctx) => {
  const log = walkLog.extend('index')
  // const error = walkError.extend('index')
  log('inside walk router: /')
  ctx.status = 200
  const csrfToken = ulid()
  ctx.session.csrfToken = csrfToken
  ctx.cookies.set('csrfToken', csrfToken, { httpOnly: true, sameSite: 'strict' })
  log('sessionUser: ', ctx.state?.sessionUser?.username)
  log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
  const locals = {
    csrfToken,
    sessionUser: ctx.state.sessionUser,
    body: ctx.body,
    flash: ctx.flash?.index ?? {},
    title: `${ctx.app.site}: Walk`,
    isAuthenticated: ctx.state.isAuthenticated,
  }
  await ctx.render('index', locals)
})

export { router as walk }
