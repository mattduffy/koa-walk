/*
 * file: public/j/worker.js
 */
onmessage = function(e) {
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
      console.log('Worker: messagee received from main script.')
      console.log(`message data: ${e.data}`)
  }
  postMessage('Take a walk.')
}
