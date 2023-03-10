/**
 * @summary Koa router for the account api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/account.js The router for the account api endpoints.
 */

import Router from '@koa/router'
import { koaBody } from 'koa-body'
import Debug from 'debug'
import { ObjectId } from 'mongodb'
import { Users, AdminUser } from '../models/users.js'

const router = new Router()

function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase()
}

function sanitize(param) {
  // fill in with some effective input scubbing logic
  return param
}

async function hasFlash(ctx, next) {
  const log = Debug('koa-stub:routes:main:hasFlash_log')
  const error = Debug('koa-stub:routes:main:hasFlash_error')
  if (ctx.flash) {
    log('ctx.flash is present: %o', ctx.flash)
  } else {
    error('ctx.flash is missing.')
  }
  await next()
}

router.get('accountView', '/account/view', hasFlash, async (ctx, next) => {
  const user = ctx.state.user ?? null
  const log = Debug('koa-stub:routes:user_edit_log')
  const error = Debug('koa-stub:routes:user_edit_error')
  await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 301
    ctx.redirect('/')
  } else {
    log(`Edit ${user.username}'s account details.`)
    const locals = {
      user,
      body: ctx.body,
      edit: ctx.flash.edit ?? {},
      csrfToken: new ObjectId().toString(),
      isAuthenticated: ctx.state.isAuthenticated,
      title: `${ctx.app.site}: View Account Details`,
    }
    ctx.status = 200
    await ctx.render('account/user-view-details', locals)
  }
})

router.get('accountEdit', '/account/edit', hasFlash, async (ctx, next) => {
  const user = ctx.state.user ?? null
  const log = Debug('koa-stub:routes:user_edit_log')
  const error = Debug('koa-stub:routes:user_edit_error')
  await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 301
    ctx.redirect('/')
  } else {
    log(`Edit ${user.username}'s account details.`)
    const locals = {
      user,
      body: ctx.body,
      edit: ctx.flash.edit ?? {},
      csrfToken: new ObjectId().toString(),
      isAuthenticated: ctx.state.isAuthenticated,
      title: `${ctx.app.site}: Edit Account Details`,
    }
    ctx.status = 200
    await ctx.render('account/user-edit-details', locals)
  }
})

export { router as account }
