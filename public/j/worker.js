/*
 * file: public/j/worker.js
 */
/* eslint-env worker */
onmessage = (e) => {
  console.log(e.data.TASK)
  switch (e.data.TASK) {
    case 'START_WALK':
      console.log(e.data.TASK, e.data.msg)
      break
    case 'STOP_WALK':
      console.log(e.data.TASK, e.data.msg)
      break
    case 'SET_WAYPOINT':
      console.log(e.data.TASK, e.data.msg)
      break
    case 'SAVE_WALK':
      console.log(e.data.TASK, e.data.msg)
      break
    case 'GET_WALK':
      console.log(e.data.TASK, e.data.msg)
      break
    default:
      console.info(e)
      console.warn('Worker: received an unknown task from the main script.')
      console.warn('message data: ', e.data)
      throw new Error(`unsupported task: ${e.data.TASK}`)
  }
}
// onerror = (error) => {
//   console.warn('oops')
//   console.warn(error)
// }
postMessage('Take a walk.')
