import Dotenv from 'dotenv'

Dotenv.config({ path: './config/test.env', debug: true })
const test = Dotenv.parse(new Buffer.from(process.env.TEST))
console.log('process.env.test: %o', test)
