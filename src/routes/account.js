/**
 * @summary Koa router for the account api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/account.js The router for the account api endpoints.
 */

import Router from '@koa/router'
import { ObjectId } from 'mongodb'
import formidable from 'formidable'
import { _log, _error } from '../utils/logging.js'
import { Users, AdminUser } from '../models/users.js'

const accountLog = _log.extend('account')
const accountError = _error.extend('account')

const formOptions = {
  encoding: 'utf-8',
  uploadDir: process.env.UPLOADSDIR,
  keepExtensions: true,
  multipart: true,
}
const router = new Router()

function isAsyncRequest(req) {
  return (req.get('X-ASYNCREQUEST') === true)
}

function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase()
}

function sanitize(param) {
  // fill in with some effective input scubbing logic
  return param
}

async function hasFlash(ctx, next) {
  const log = accountLog.extend('hasFlash')
  const error = accountError.extend('hasFlash')
  if (ctx.flash) {
    log('ctx.flash is present: %o', ctx.flash)
  } else {
    error('ctx.flash is missing.')
  }
  await next()
}

router.get('accountPasswordGET', '/account/change/password', hasFlash, async (ctx, next) => {
  const log = accountLog.extend('GET-account-change-password')
  const error = accountError.extend('GET-account-change-password')
  // await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`View ${ctx.state.user.username}'s account password.`)
    const csrfToken = new ObjectId().toString()
    ctx.session.csrfToken = csrfToken
    ctx.cookies.set('csrfToken', csrfToken, { httpOnly: true, sameSite: 'strict' })
    if (isAsyncRequest(ctx.request)) {
      // async request, send back json
      ctx.type = 'application/json; charset=utf-8'
      // ctx.body = ctx.headers
      ctx.body = { nopeeking: true }
    } else {
      // regular http request, send back view
      const locals = {
        csrfToken,
        body: ctx.body,
        user: ctx.state.user,
        flash: ctx.flash.edit ?? {},
        isAuthenticated: ctx.state.isAuthenticated,
        title: `${ctx.app.site}: View Account Password`,
      }
      ctx.status = 200
      await ctx.render('account/user-password', locals)
    }
  }
})

// router.post('accountPasswordPOST', '/account/change/password', hasFlash, koaBody(), async (ctx, next) => {
router.post('accountPasswordPOST', '/account/change/password', hasFlash, async (ctx, next) => {
  const log = accountLog.extend('POST-account-change-password')
  const error = accountError.extend('POST-account-change-password')
  const form = formidable({
    encoding: 'utf-8',
    uploadDir: ctx.app.uploadsDir,
    keepExtensions: true,
    multipart: true,
  })
  await new Promise((resolve, reject) => {
    form.parse(ctx.req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }
      ctx.request.body = fields
      ctx.request.files = files
      // log(fields)
      // log(files)
      resolve()
    })
  })
  // log(ctx.request.body)
  // await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`View ${ctx.state.user.username}'s account password.`)
    const sessionId = ctx.cookies.get('koa.sess')
    const csrfTokenCookie = ctx.cookies.get('csrfToken')
    const csrfTokenSession = ctx.session.csrfToken
    const csrfTokenHidden = ctx.request.body['csrf-token']
    const { currentPassword } = ctx.request.body || ''
    const { newPassword1 } = ctx.request.body || ''
    const { newPassword2 } = ctx.request.body || ''
    if (csrfTokenCookie === csrfTokenSession && csrfTokenSession === csrfTokenHidden) {
      if (currentPassword === '') {
        error('currentPassword is missing.')
        ctx.flash = { edit: { error: 'Missing current password.' } }
        ctx.redirect('/account/change/password')
      } else if (newPassword1 === '' || newPassword2 === '' || newPassword1 !== newPassword2) {
        error('newPasswords are missing or don\'t match.')
        ctx.flash = { edit: { error: 'New passwords must match.' } }
        ctx.redirect('/account/change/password')
      } else {
        try {
          log('Have currentPassword and matching newPasswordn')
          const result = await ctx.state.user.updatePassword(currentPassword, newPassword1)
          if (result.success) {
            ctx.state.user = await ctx.state.user.update()
            ctx.flash = { edit: { message: result.message } }
            ctx.redirect('/account/change/password')
          } else {
            ctx.flash = { edit: { error: 'Couldn\'t update password.' } }
            ctx.redirect('/account/change/password')
          }
        } catch (e) {
          ctx.flash = { edit: { error: e.message } }
          ctx.redirect('/account/change/password')
        }
      }
    } else {
      error('csrf token mismatch')
      delete ctx.session.csrfToken
      ctx.cookies.set('csrfToken')
      ctx.status = 403
      ctx.type = 'application/json'
      ctx.body = { status: 'Error, csrf tokens do not match' }
    }
  }
})

router.get('accountTokens', '/account/tokens', hasFlash, async (ctx, next) => {
  const log = accountLog.extend('GET-account-tokens')
  const error = accountError.extend('GET-account-tokens')
  // await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`View ${ctx.state.user.username}'s account tokens.`)

    if (isAsyncRequest(ctx.request)) {
      // async request, send back json
      ctx.type = 'application/json; charset=utf-8'
      ctx.body = ctx.state.user.jwts
    } else {
      // regular http request, send back view
      const locals = {
        user: ctx.state.user,
        body: ctx.body,
        view: ctx.flash.view ?? {},
        isAuthenticated: ctx.state.isAuthenticated,
        title: `${ctx.app.site}: View Account Tokens`,
      }
      ctx.status = 200
      await ctx.render('account/user-tokens', locals)
    }
  }
})

router.get('accountView', '/account/view', hasFlash, async (ctx, next) => {
  const log = accountLog.extend('GET-account-view')
  const error = accountError.extend('GET-account-view')
  const user = ctx.state.user ?? null
  await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
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
  const log = accountLog.extend('GET-account-edit')
  const error = accountError.extend('GET-account-edit')
  const user = ctx.state.user ?? null
  // await next()
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

router.post('accountEditPost', '/account/edit', hasFlash, async (ctx, next) => {
  const log = accountLog.extend('POST-account-edit')
  const error = accountError.extend('POST-account-edit')
  const form = formidable({
    encoding: 'utf-8',
    uploadDir: ctx.app.uploadsDir,
    keepExtensions: true,
    multipart: true,
  })
  await new Promise((resolve, reject) => {
    form.parse(ctx.req, (err, fields, files) => {
      if (err) {
        reject(err)
        return
      }
      ctx.request.body = fields
      ctx.request.files = files
      // log(fields)
      // log(files)
      resolve()
    })
  })
  // log(ctx.request.body)
  // await next()
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
    // log(`ctx..body: ${ctx.request.body}`)
    // log(`ctx.fields: ${ctx.request.fields}`)
    // log('avatar file: %O', ctx.request.files.avatar)
    // log('header file: %O', ctx.request.files.header)
    const sessionId = ctx.cookies.get('koa.sess')
    const csrfTokenCookie = ctx.cookies.get('csrfToken')
    const csrfTokenSession = ctx.session.csrfToken
    const csrfTokenHidden = ctx.request.body['csrf-token']
    if (csrfTokenCookie === csrfTokenSession && csrfTokenSession === csrfTokenHidden) {
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
      ctx.status = 403
      ctx.type = 'application/json'
      ctx.body = { status: 'Error, csrf tokens do not match' }
    }
  }
})

export { router as account }
