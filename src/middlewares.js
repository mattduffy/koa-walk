/**
 * @summary Useful middleware functions.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/middlewares.js A small library of useful middleware funtions.
 */

// import Debug from 'debug'
import { _log, _error } from './utils/logging.js'
import { Users } from './models/users.js'

const middlewareLog = _log.extend('middlewares')
const middlewareError = _error.extend('middlewares')

export async function getSessionUser(ctx, next) {
  const log = middlewareLog.extend('getSessionUser')
  const error = middlewareLog.extend('getSessionUser')
  if (ctx.session?.id) {
    try {
      log(`restoring session user: ${ctx.session.id}`)
      const db = ctx.state.mongodb.client.db()
      const collection = db.collection('users')
      const users = new Users(collection, ctx)
      const user = await users.getById(ctx.session.id)
      if (user) {
        ctx.state.user = user
        ctx.state.isAuthenticated = true
      } else {
        ctx.state.isAuthenticated = false
        ctx.state.user = {}
      }
    } catch (e) {
      error(e)
    }
  }
  await next()
}

export function flashMessage(options, application) {
  const log = middlewareLog.extend('flashMessage')
  const error = middlewareError.extend('flashMessage')
  let app
  let opts
  if (options && typeof options.use === 'function') {
    opts = application
    app = options
  } else {
    app = application
    opts = options
  }
  if (!app || typeof app.use !== 'function') {
    error('Required app instance not provided.')
    throw new Error('App instance is required: flashMessage(opts, app)')
  }
  log('adding the flash property to the app.context')
  const key = opts.key ?? 'flash'
  const msg = opts.msg ?? {}

  return async function flash(ctx, next) {
    if (ctx.session === undefined) {
      throw new Error('Session is required to store flash messages.')
    }
    const message = ctx.session[key] ?? msg
    delete ctx.session[key]
    Object.defineProperty(app.context, 'flash', {
      configurable: true,
      enumerable: true,
      get() {
        return message
      },
      set(x) {
        ctx.session[key] = x
      },
    })
    await next()
    if (ctx.status === 302 && ctx.session && !ctx.session[key]) {
      ctx.session[key] = message
    }
  }
}
export function prepareRequest(options = {}) {
  const log = middlewareLog.extend('prepareRequest')
  const error = middlewareError.extend('prepareRequest')
  return async function prepRequest(ctx, next) {
    // Is the request an Async / Ajax style request?
    // log(ctx.request.headers)
    ctx.state.isAsyncRequest = null
    ctx.state.accessToken = null
    if (/json/.test(ctx.request.get('Accept'))
    || ctx.request.get('X-ASYNCREQUEST')
    || ctx.request.get('X-AJAXREQUEST')
    || ctx.request.get('X-REQUESTED-WITH')) {
      log(`Async request made: ${ctx.request.get('accept')}`)
      ctx.state.isAsyncRequest = true
    }
    // Check for Authorization Bearer (access) token
    const accessToken = /Bearer\s([\w._-]*)$/.exec(ctx.request.get('Authorization'))
    if (accessToken && accessToken[1]) {
      log(`access token: ${accessToken[1]}`);
      [, ctx.state.accessToken] = accessToken
    }
    await next()
  }
}

export function tokenAuthMiddleware(options = {}) {
  const log = middlewareLog.extend('tokenAuth')
  const error = middlewareError.extend('tokenAuth')
  return async function authenticateTokenUser(ctx, next) {
    if (ctx.state?.isAsyncRequest && ctx.state?.accessToken !== null) {
      log('Authenticating async request by access token')
      const isValidToken = /[^+\s]*[A-Za-z0-9._-]*/g.exec(ctx.state.accessToken)
      if (!isValidToken) {
        ctx.status = 400
        ctx.type = 'text/plain; charset=utf-8'
        ctx.body = `HTTP 400 Bad Request\nWWW-Authenticate: Bearer realm="${ctx.app.domain}"`
      } else {
        try {
          const db = ctx.state.mongodb.client.db()
          const collection = db.collection('users')
          const users = new Users(collection)
          const tokenUser = await users.authenticateByAccessToken(ctx.state.accessToken)
          if (tokenUser && tokenUser.message === 'success') {
            ctx.state.user = tokenUser.user
            ctx.state.isAuthenticated = true
            await next()
          } else {
            ctx.state.isAuthenticated = false
            ctx.state.user = {}
            ctx.status = 401
            ctx.type = 'text/plain; charset=utf-8'
            ctx.body = `HTTP 401 Unauthorized\nWWW-Authenticate: Bearer realm="${ctx.app.domain}"`
          }
        } catch (e) {
          error(e)
          ctx.status = 403
          ctx.type = 'text/plain; charset=utf-8'
          ctx.body = `HTTP 403 Forbidden\nWWW-Authenticate: Bearer realm="${ctx.app.domain}"`
        }
      }
    } else {
      log('Not an async request bearing jwt access token.')
      await next()
    }
  }
}

export async function errorHandlers(ctx, next) {
  const log = middlewareLog.extend('errorHandler')
  const error = middlewareError.extend('errorHandler')
  const user = ctx.state.user ?? {}
  try {
    await next()
    if (!ctx.body) {
      error('404, How get here?')
      ctx.status = 404
      const locals = {
        body: ctx.body,
        title: `${ctx.app.site}: 404`,
        user,
        isAuthenticated: ctx.state.isAuthenticated,
      }
      await ctx.render('404', locals)
    }
  } catch (e) {
    if (ctx.status === 500) {
      error('500, How get here?')
      const locals = {
        body: ctx.body,
        title: `${ctx.app.site}: 500`,
        user,
        isAuthenticated: ctx.state.isAuthenticated,
      }
      await ctx.render('500', locals)
    }
  }
}
