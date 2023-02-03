/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/middlewares.js A small library of useful middleware funtions.
 */

import Debug from 'debug'

// const log = Debug('koa-stub:middlewares:log')
// const error = Debug('koa-stub:middlewares:error')

export function flashMessage(opts) {
  const options = { ...opts }
  const key = options.key || 'flash'
  const msgs = options.msgs || { success: [], warning: [], error: [] }
  const log = Debug('koa-stub:flashMessage:log')
  const error = Debug('koa-stub:flashMessage:error')
  log(`${this}`)

  async function flash(ctx, next) {
    if (!ctx.session) {
      error('Missing session for storing flash messages.')
      throw new Error('Missing session for storing flash messages.')
    }
    const data = ctx.session[key] || msgs
    delete ctx.session[key]
    log(`${opts}`)
    log(`${this}`)
    log(ctx.session)

    await next()
    if (ctx.status === 302 && ctx.session && !ctx.session[key]) {
      ctx.session[key] = data
    }
  }

  /* eslint-disable object-shorthand */
  /* eslint-disable func-names */
  Object.defineProperty(flash, 'flash', {
    enumerable: true,
    set: function (x) {
      // data = x
      ctx.session[key] = x
    },
    get: function () {
      return data
    },
  })
  return flash
}
