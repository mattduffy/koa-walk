/**
 * @summary Koa router for the account api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/account.js The router for the account api endpoints.
 */

import path from 'node:path'
import { rename } from 'node:fs/promises'
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
    log(`View ${ctx.state.sessionUser.username}'s account password.`)
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
        sessionUser: ctx.state.sessionUser,
        flash: ctx.flash.edit ?? {},
        isAuthenticated: ctx.state.isAuthenticated,
        title: `${ctx.app.site}: View Account Password`,
      }
      ctx.status = 200
      await ctx.render('account/user-password', locals)
    }
  }
})

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
      // log(files)
      resolve()
    })
  })
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`View ${ctx.state.sessionUser.username}'s account password.`)
    const sessionId = ctx.cookies.get('session')
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
          const result = await ctx.state.sessionUser.updatePassword(currentPassword, newPassword1)
          if (result.success) {
            ctx.state.sessionUser = await ctx.state.sessionUser.update()
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
    log(`View ${ctx.state.sessionUser.username}'s account tokens.`)

    if (isAsyncRequest(ctx.request)) {
      // async request, send back json
      ctx.type = 'application/json; charset=utf-8'
      ctx.body = ctx.state.sessionUser.jwts
    } else {
      // regular http request, send back view
      const locals = {
        sessionUser: ctx.state.sessionUser,
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
  // await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`View ${ctx.state.sessionUser.username}'s account details.`)
    log('flash %O', ctx.flash)
    const locals = {
      sessionUser: ctx.state.sessionUser,
      body: ctx.body,
      edit: ctx.flash.edit ?? {},
      origin: `${ctx.request.origin}`,
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
  // await next()
  if (!ctx.state?.isAuthenticated) {
    error('User is not authenticated.  Redirect to /')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`Edit ${ctx.state.sessionUser.username}'s account details.`)
    const csrfToken = new ObjectId().toString()
    log(ctx.flash)
    const locals = {
      sessionUser: ctx.state.sessionUser,
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
        error('There was a problem parsing the multipart form data.')
        error(err)
        reject(err)
        return
      }
      log('Multipart form data was successfully parsed.')
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
    const sessionId = ctx.cookies.get('session')
    const csrfTokenCookie = ctx.cookies.get('csrfToken')
    const csrfTokenSession = ctx.session.csrfToken
    const csrfTokenHidden = ctx.request.body['csrf-token']
    if (csrfTokenCookie === csrfTokenSession && csrfTokenSession === csrfTokenHidden) {
      const { firstname } = ctx.request.body
      if (firstname !== '') ctx.state.sessionUser.firstName = firstname
      const { lastname } = ctx.request.body
      if (lastname !== '') ctx.state.sessionUser.lastName = lastname
      const { username } = ctx.request.body
      if (username !== '') ctx.state.sessionUser.username = username
      const { displayname } = ctx.request.body
      if (displayname !== '') ctx.state.sessionUser.displayName = displayname
      const { primaryEmail } = ctx.request.body
      if (primaryEmail !== '') ctx.state.sessionUser.primarEmail = primaryEmail
      const { secondaryEmail } = ctx.request.body
      if (secondaryEmail !== '') ctx.state.sessionUser.secondaryEmail = secondaryEmail
      const { description } = ctx.request.body
      if (description !== '') ctx.state.sessionUser.description = description
      log('avatar file: %O', ctx.request.files.avatar.size)
      log('avatar file: %O', ctx.request.files.avatar.filepath)
      if (ctx.state.sessionUser.publicDir === '') {
        // log('users ctx: %O', ctx.state.sessionUser._ctx)
        log(`${ctx.state.sessionUser.username} - no upload directory set yet, setting it now.`)
        ctx.state.sessionUser.publicDir = 'a'
      }
      const { avatar } = ctx.request.files
      if (avatar.size > 0) {
        const avatarSaved = path.resolve(`${ctx.app.publicDir}/${ctx.state.sessionUser.publicDir}avatar-${avatar.originalFilename}`)
        await rename(avatar.filepath, avatarSaved)
        ctx.state.sessionUser.avatar = `${ctx.state.sessionUser.publicDir}avatar-${avatar.originalFilename}`
      }
      // log('header file: %O', ctx.request.files.header)
      const { header } = ctx.request.files
      if (header.size > 0) {
        const headerSaved = path.resolve(`${ctx.app.publicDir}/${ctx.state.sessionUser.publicDir}header-${header.originalFilename}`)
        await rename(header.filepath, headerSaved)
        ctx.state.sessionUser.header = `${ctx.state.sessionUser.publicDir}header-${header.originalFilename}`
      }
      const { url } = ctx.request.body
      if (url !== '') ctx.state.sessionUser.url = url
      try {
        ctx.state.sessionUser = await ctx.state.sessionUser.update()
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

router.get('adminListUsers', '/admin/account/listusers', hasFlash, async (ctx, next) => {
  const log = accountLog.extend('GET-admin-listusers')
  const error = accountError.extend('GET-admin-listuers')
  if (!ctx.state?.isAuthenticated) {
    ctx.flash = {
      index: {
        message: null,
        error: 'You need to be logged in to do that.',
      },
    }
    error('Tried view something without being authenticated.')
    ctx.status = 401
    ctx.redirect('/')
  } else {
    log(`Welcome admin level user: ${ctx.state.sessionUser.username}`)
    const db = ctx.state.mongodb.client.db()
    const collection = db.collection('users')
    const users = new Users(collection, ctx)
    const allUsers = await users.getAllUsers()
    const locals = {
      title: `${ctx.app.site}: List Users`,
      origin: ctx.request.origin,
      isAuthenticated: ctx.state.isAuthenticated,
      list: ctx.flash,
    }
    allUsers.map((u) => {
      locals[u._id] = u.users
      return undefined
    })
    await ctx.render('account/admin-listusers', locals)
  }
})

export { router as account }
