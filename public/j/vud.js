const link = document.querySelector('span#createKeys')
if (link !== null) {
  link.classList.add('link')
  link.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const opts = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        CsrfToken: csrfToken,
      },
    }
    const url = link.dataset.href
    const request = new Request(url, opts)
    const response = await fetch(request)
    const pubs = await response.json()
    console.log(pubs)
    const dd = e.target.parentNode
    const ahref = document.createElement('a')
    const jwks = `${origin}/${atUsername}/jwks.json`
    ahref.href = jwks
    ahref.dataset.id = 'jwks.json'
    ahref.appendChild(document.createTextNode(jwks))
    dd.innerHTML = ''
    dd.appendChild(ahref)
  })
}
