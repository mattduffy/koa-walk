/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/middlewares.js A small library of useful middleware funtions.
 */

import Debug from 'debug'
import { Users } from './models/users.js'

// const log = Debug('koa-stub:middlewares:log')
// const error = Debug('koa-stub:middlewares:error')

export async function getSessionUser(ctx, next) {
  const log = Debug('koa-stub:getSessionUser_log')
  const error = Debug('koa-stub:getSessionUser_error')
  if (ctx.session?.id) {
    try {
      const db = ctx.state.mongodb.client.db()
      const collection = db.collection('users')
      const users = new Users(collection)
      const user = await users.getById(ctx.session.id)
      if (user) {
        ctx.state.user = user
        ctx.state.isAuthenticated = true
      }
    } catch (e) {
      error(e)
    }
  }
  await next()
}

export function flashMessage(options, application) {
  const log = Debug('koa-stub:flashMessage:log')
  const error = Debug('koa-stub:flashMessage:error')
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
  const key = opts.key || 'flash'
  const msg = opts.msg || {}

  return async function flash(ctx, next) {
    if (ctx.session === undefined) {
      throw new Error('Session is required to store flash messages.')
    }
    const message = ctx.session[key] || msg
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

export async function errorHandlers(ctx, next) {
  const user = ctx.state.user || {}
  try {
    await next()
    if (!ctx.body) {
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
