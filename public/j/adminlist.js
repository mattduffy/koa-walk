function updateGrid(dataset, target) {
  const div = document.createElement('div')
  div.classList.add('gridspan')
  // div.setAttribute('class', 'gridspan')
  // div.className = 'gridspan'
  const text = document.createTextNode(`Permanently deleted ${dataset.username}.  No going back...`)
  div.appendChild(text)
  target.parentNode.insertBefore(div, target)
  console.log(div)
}

function doDelete(dataset, node) {
  if (!dataset) {
    console.error('No dataset values provided.  No delete issued.')
    return false
  }
  console.log('doDelete called with: ')
  console.table(dataset)
  updateGrid(dataset, node)
  return true
}

window.addEventListener('load', () => {
  const trashcans = document.querySelectorAll('img.trashcan')
  for (const can of trashcans.entries()) {
    console.log(can[1].dataset)
    can[1].addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()
      const editNode = can[1].parentNode.previousElementSibling
      const viewNode = editNode.previousElementSibling
      const statusNode = viewNode.previousElementSibling
      const usernameNode = statusNode.previousElementSibling
      const deletePrompt = `You are about to delete <em>${usernameNode.firstChild.text}'s</em> account.<br>`
        + 'This action cannot be undone.<br>'
        + 'Are you sure you want to delete this account?<br>'
      const dialog = document.querySelector('dialog[id="dia"]')
      dialog.firstElementChild.innerHTML = deletePrompt
      const yes = document.querySelector('span[id="yes"]')
      yes.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        dialog.close('yes')
      })
      const no = document.querySelector('span[id="no"]')
      no.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        dialog.close('no')
      })
      dialog.addEventListener('close', (e) => {
        console.info(`dialog.returnValue: ${dialog.returnValue}`)
        if (dialog.returnValue === 'yes') {
          console.log(can[1].dataset)
          doDelete(can[1].dataset, usernameNode)
        }
      })
      dialog.showModal()
    })
  }
})
