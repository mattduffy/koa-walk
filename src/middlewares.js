/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/middlewares.js A small library of useful middleware funtions.
 */

import Debug from 'debug'

// const log = Debug('koa-stub:middlewares:log')
// const error = Debug('koa-stub:middlewares:error')

export function flashMessage(options) {
  const log = Debug('koa-stub:flashMessage:log')
  const error = Debug('koa-stub:flashMessage:error')
  const opts = { ...options }
  const key = opts.key || 'flash'
  const msgs = opts.msgs || {}
  let messages

  async function flash(ctx, next) {
    messages = ctx.session[key] || {}
    // delete ctx.session[key]
    await next()
    if (ctx.status === 302 && ctx.session && !(ctx.session[key])) {
      // ctx.session[key] = messages
      ctx.session[key] = messages
    }
  }
  /* eslint-disable object-shorthand */

/*
 * Add the `flash` objet property directly to the app.contxt object somehow.
 */


  Object.defineProperty(flash, 'flash', {
    enumerable: true,
    get: function() {
      return messages
    },
    set: function(x) {
      ctx.session[key] = x
    },
  })
  return flash
}

export async function errorHandlers(ctx, next) {
  const user = ctx.state.user || {}
  try {
    await next()
    if (!ctx.body) {
      ctx.status = 404
      const locals = { body: ctx.body, title: `${ctx.app.site}: 404`, user }
      await ctx.render('404', locals)
    }
  } catch (e) {
    const locals = { body: ctx.body, title: `${ctx.app.site}: 500`, user }
    if (ctx.status === 500) {
      await ctx.render('500', locals)
    }
  }
}
