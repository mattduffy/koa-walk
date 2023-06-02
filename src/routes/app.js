/**
 * @summary Koa router for the app api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/app.js The router for the app api endpoints.
 */

import Router from '@koa/router'

const router = new Router()

router.get('appKeys', '/admin/app/keys', async (ctx, next) => {
  const locals = {
    title: `${ctx.app.site}: App keys`,
  }
  await ctx.render('app/server-keys', locals)
})

export { router as app }
