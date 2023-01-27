/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/main.js The router for the top level app URLs.
 */

import Router from '@koa/router'

const router = new Router()
router.get('index', '/', async (ctx, next) => {
  await next()
  console.log('inside main router: /')
  let user = 'some random guy.'
  if (ctx.state.user1) {
    user = ctx.state.user1
  }
  await ctx.render('index', { body: ctx.body, title: `${ctx.app.site}: Contact`, user })
})

router.get('about', '/about', async (ctx, next) => {
  await next()
  console.log('inside index router: /about')
  await ctx.render('about', { body: ctx.body, title: `${ctx.app.site}: Contact` })
})

router.get('contact', '/contact', async (ctx, next) => {
  await next()
  await ctx.render('contact', { title: `${ctx.app.site}: Contact` })
})

export { router as main }
