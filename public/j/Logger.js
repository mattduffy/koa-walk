/*
 * file: public/j/Logger.js
 */
class Logger {
  constructor(level) {
    switch(level) {
      case 'scream':
        this.log = console.log.bind(console)
        this.info = this.log 
        this.warn = this.log 
        this.error = this.log 
        this.log('level is', level)
        this.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHHHHHHHHHHHHHHHHHHHHHHH") 
        break
      case 'verbose':
        this.log = console.log.bind(console)
        this.info = console.info.bind(console)
        this.warn = console.warn.bind(console)
        this.error = console.error.bind(console)
        this.log('level is', level)
        break
      case 'normal':
        this.log = console.log.bind(console)
        this.info = console.info.bind(console)
        this.warn = () => {}
        this.error = console.error.bind(console)
        this.log('level is', level)
        break
    case 'quiet':
        this.log = () => {}
        this.info = () => {}
        this.warn = () => {}
        this.error = console.error.bind(console)
        this.log('level is', level)
        break
    default:
        this.log = console.log.bind(console)
        this.info = console.info.bind(console)
        this.warn = console.warn.bind(console)
        this.error = console.error.bind(console)
        this.log('no log level specified')
        this.log('using default verbose level')
        break
    }
  }
}
const level = new URL(import.meta.url).searchParams.get('level')
console.log('module level', level)
const logger = new Logger(level)
const log = logger.log
const info = logger.info
const warn = logger.warn
const error = logger.error
export {
  log,
  info,
  warn,
  error,
}
