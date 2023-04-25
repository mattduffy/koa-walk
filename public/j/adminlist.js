window.addEventListener('load', (event) => {
  alert(event)
  const trashcans = document.querySelectorAll('img.trashcan')
  for (const can of trashcans.entries()) {
    console.log(can[1].dataset)
    can[1].addEventListener('click', (event) => {
      e.stopPropagation()
      e.preventDefault()
      alert(event.target.dataset.id)
    })
  }
})
