/**
 * @summary Entry point into @mattduffy/users models.
 * @exports @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file ./src/models/users.js
 */
import * as Dotenv from 'dotenv'
import { Users } from '@mattduffy/users'
// import { client, ObjectId } from '@mattduffy/users/mongoclient'

if (process.env?.MONGODB_CLIENT_DN === undefined) {
  Dotenv.conf({ path: 'config/mongodb.env', debug: true })
  console.log(process.env)
}

// const users = await new Users(client)
// const me = users.getByEmail('matt@mattmail.email.602b')
// console.log(me.description)

export {
  Users,
}
