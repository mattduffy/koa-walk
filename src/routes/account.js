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
  const log = Debug('koa-stub:routes:account:hasFlash_log')
  const error = Debug('koa-stub:routes:account:hasFlash_error')
  if (ctx.flash) {
    log('ctx.flash is present: %o', ctx.flash)
  } else {
    error('ctx.flash is missing.')
  }
  await next()
}

router.get('accountView', '/account/view', hasFlash, async (ctx, next) => {
  const user = ctx.state.user ?? null
  const log = Debug('koa-stub:routes:account_edit_log')
  const error = Debug('koa-stub:routes:account_edit_error')
  await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`Edit ${user.username}'s account details.`)
    log(ctx.flash)
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
  const log = Debug('koa-stub:routes:account_edit_log')
  const error = Debug('koa-stub:routes:account_edit_error')
  await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`Edit ${user.username}'s account details.`)
    const csrfToken = new ObjectId().toString()
    log(ctx.flash)
    const locals = {
      user,
      body: ctx.body,
      edit: ctx.flash.edit ?? {},
      csrfToken,
      isAuthenticated: ctx.state.isAuthenticated,
      title: `${ctx.app.site}: Edit Account Details`,
    }
    ctx.session.csrfToken = csrfToken
    ctx.cookies.set('csrfToken', csrfToken, { httpOnly: true, sameSite: 'strict' })
    ctx.status = 200
    await ctx.render('account/user-edit-details', locals)
  }
})

router.post('accountEditPost', '/account/edit', hasFlash, koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:account_edit_post_log')
  const error = Debug('koa-stub:routes:account_edit_post_error')
  await next()
  if (!ctx.state?.isAuthenticated) {
    ctx.flash = {
      index: {
        message: null,
        error: 'You need to be logged in to make account changes.',
      },
    }
    error('Tried to edit account without being authenticated.')
    ctx.redirect('/')
  } else {
    const sessionId = ctx.cookies.get('koa.sess')
    const csrfTokenCookie = ctx.cookies.get('csrfToken')
    const csrfTokenSession = ctx.session.csrfToken
    const csrfTokenHidden = ctx.request.body['csrf-token']
    if (csrfTokenCookie === csrfTokenSession && csrfTokenSession === csrfTokenHidden) {
      error(ctx.request.body)
      const { firstname } = ctx.request.body
      if (firstname !== '') ctx.state.user.firstName = firstname
      const { lastname } = ctx.request.body
      if (lastname !== '') ctx.state.user.lastName = lastname
      const { username } = ctx.request.body
      if (username !== '') ctx.state.user.username = username
      const { displayname } = ctx.request.body
      if (displayname !== '') ctx.state.user.displayName = displayname
      const { primaryEmail } = ctx.request.body
      if (primaryEmail !== '') ctx.state.user.primarEmail = primaryEmail
      const { secondaryEmail } = ctx.request.body
      if (secondaryEmail !== '') ctx.state.user.secondaryEmail = secondaryEmail
      const { description } = ctx.request.body
      if (description !== '') ctx.state.user.description = description
      const { avatar } = ctx.request.body
      if (avatar !== '') ctx.state.user.avatar = avatar
      const { header } = ctx.request.body
      if (header !== '') ctx.state.user.header = header
      const { url } = ctx.request.body
      if (url !== '') ctx.state.user.url = url
      try {
        ctx.state.user = await ctx.state.user.update()
        delete ctx.session.csrfToken
        ctx.cookies.set('csrfToken')
        ctx.cookies.set('csrfToken.sig')
        ctx.flash = {
          edit: {
            message: 'Account has been updated.',
            error: null,
          },
        }
        ctx.redirect('/account/view')
      } catch (e) {
        error(e)
        ctx.status = 304
        ctx.flash = {
          error: e,
          message: null,
        }
        ctx.redirect('/account/edit')
      }
    } else {
      error('csrf token mismatch')
      ctx.type = 'application/json'
      ctx.body = { status: 'Error, csrf tokens do not match' }
    }
  }
})

export { router as account }
