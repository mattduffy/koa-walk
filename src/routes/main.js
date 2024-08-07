/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/main.js The router for the top level app URLs.
 */

import Router from '@koa/router'
// import { ObjectId } from 'mongodb'
import { Albums } from '@mattduffy/albums/Albums' // eslint-disable-line import/no-unresolved
import { Blogs } from '@mattduffy/blogs' // eslint-disable-line import/no-unresolved
// import { Users } from '../models/users.js'
import { _log, _error } from '../utils/logging.js'
import { redis } from '../daos/impl/redis/redis-client.js'

const mainLog = _log.extend('main')
const mainError = _error.extend('main')
/* eslint-disable-next-line no-unused-vars */
function sanitize(param) {
  // fill in with some effective input scubbing logic
  return param
}
const router = new Router()
async function hasFlash(ctx, next) {
  const log = mainLog.extend('hasFlash')
  const error = mainError.extend('hasFlash')
  if (ctx.flash) {
    log('ctx.flash is present: %o', ctx.flash)
  } else {
    error('ctx.flash is missing.')
  }
  await next()
}

router.get('index', '/', hasFlash, async (ctx) => {
  const log = mainLog.extend('index')
  // const error = mainError.extend('index')
  log('inside main router: /')
  ctx.status = 200
  // log(ctx.state.sessionUser)
  await ctx.render('index', {
    sessionUser: ctx.state.sessionUser,
    body: ctx.body,
    flash: ctx.flash?.index ?? {},
    title: `${ctx.app.site}: Home`,
    isAuthenticated: ctx.state.isAuthenticated,
  })
})

router.get('galleries', '/galleries', hasFlash, async (ctx) => {
  const log = mainLog.extend('galleries')
  const error = mainError.extend('galleries')
  log('inside index router: /galleries')
  ctx.status = 200
  let recent10
  try {
    recent10 = await Albums.recentlyAdded(redis)
  } catch (e) {
    error(e)
  }
  log('recent10: ', recent10)
  let publicAlbums
  try {
    publicAlbums = await Albums.usersWithPublicAlbums(ctx.state.mongodb.client.db())
  } catch (e) {
    error(e)
  }
  log('users with public albums: ', publicAlbums)
  await ctx.render('galleries', {
    recent10,
    publicAlbums,
    body: ctx.body,
    origin: ctx.request.origin,
    flash: ctx.flash?.galleries ?? {},
    title: `${ctx.app.site}: Galleries`,
    sessionUser: ctx.state.sessionUser,
    isAuthenticated: ctx.state.isAuthenticated,
  })
})

router.get('blogs', '/blog', hasFlash, async (ctx) => {
  const log = mainLog.extend('blogs')
  const error = mainError.extend('blogs')
  log('inside index router: /blogs')
  ctx.status = 200
  let recent10
  try {
    recent10 = await Blogs.recentlyUpdated(redis)
  } catch (e) {
    error(e)
  }
  log('recent10: ', recent10)
  let publicBlogs
  try {
    publicBlogs = await Blogs.usersWithPublicBlogs(ctx.state.mongodb.client.db())
  } catch (e) {
    error(e)
  }
  log('users with public blogs: ', publicBlogs)
  await ctx.render('blogs', {
    recent10,
    publicBlogs,
    body: ctx.body,
    origin: ctx.request.origin,
    flash: ctx.flash?.blogs ?? {},
    title: `${ctx.app.site}: Blogs`,
    sessionUser: ctx.state.sessionUser,
    isAuthenticated: ctx.state.isAuthenticated,
  })
})

router.get('userBlog', '/:username/blog', async (ctx) => {
  const log = mainLog.extend('userBlog')
  const error = mainError.extend('userBlog')
  log('inside index router: /@<username>/blog')
  let blog
  let posts
  const username = ctx.params.username.slice(1)
  log(username)
  try {
    blog = await Blogs.getByUsername(ctx.state.mongodb.client.db(), username)
    posts = await blog.posts(0, 'all')
    log(posts)
  } catch (e) {
    const msg = `Failed to get blog for ${username}.`
    error(msg)
    error(e)
  }
  const locals = {
    blog,
    posts,
    body: ctx.body,
    // origin: ctx.request.origin,
    flash: ctx.flash?.blogs ?? {},
    title: `${ctx.app.site}: Blog: @${username}`,
    username,
    sessionUser: null,
    isAuthenticated: ctx.state.isAuthenticated,
  }
  await ctx.render('blog-user', locals)
})

router.get('about', '/about', hasFlash, async (ctx) => {
  const log = mainLog.extend('about')
  // const error = mainError.extend('about')
  log('inside index router: /about')
  ctx.status = 200
  await ctx.render('about', {
    body: ctx.body,
    title: `${ctx.app.site}: About`,
    sessionUser: ctx.state.sessionUser,
    isAuthenticated: ctx.state.isAuthenticated,
  })
})

router.get('contact', '/contact', hasFlash, async (ctx) => {
  const log = mainLog.extend('contact')
  // const error = mainError.extend('contact')
  log('inside index router: /contact')
  ctx.status = 200
  await ctx.render('contact', {
    title: `${ctx.app.site}: Contact`,
    sessionUser: ctx.state.sessionUser,
    isAuthenticated: ctx.state.isAuthenticated,
  })
})

router.get('renderTest', '/renderTest', async (ctx) => {
  const log = mainLog.extend('renderTest')
  const rendered = await ctx.render('renderTest', {
    title: `${ctx.app.site}: render test`,
    user: ctx.state?.user ?? 'Matt',
    sessionUser: ctx.state?.sessionUser ?? {},
    isAuthenticated: false,
  })
  log(rendered)
  ctx.redirect('/')
})

export { router as main }
