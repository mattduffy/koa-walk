/*
 * file: public/j/worker.js
 */
onmessage = function(e) {
  console.log('Worker: messagee received from main script.')
  console.log(`message data: ${e.data}`)
  postMessage('Take a walk.')
}
