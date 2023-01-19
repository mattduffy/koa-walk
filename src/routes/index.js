/**
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/index.js The router for the top level app URLs.
 */

import Router from '@koa/router'

const router = new Router()
router.get('index', '/', async (ctx, next) => {
  await next()
  console.log('inside index router: /')
  await ctx.render('index', { body: ctx.body, title: 'Home Page' })
})

router.get('about', '/about', async (ctx, next) => {
  await next()
  console.log('inside index router: /about')
  await ctx.render('about', { body: ctx.body, title: 'About Face' })
})

export { router as index }
