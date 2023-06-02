function createKeysUser(link) {
  link.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const opts = {
      method: 'GET',
      headers: {
        CsrfToken: csrfToken,
        Accept: 'application/json',
        Authorization: `Bearer ${jwtAccess}`,
      },
    }
    const url = link.dataset.href
    const request = new Request(url, opts)
    const response = await fetch(request, { credentials: 'same-origin' })
    const pubs = await response.json()
    console.log(pubs)
    const parent = e.target.parentNode
    if (pubs.status === 'success') {
      const ahref = document.createElement('a')
      ahref.href = pubs.url
      ahref.dataset.id = 'jwks.json'
      ahref.appendChild(document.createTextNode(pubs.url))
      parent.innerHTML = ''
      parent.appendChild(ahref)
      const sig = document.querySelector('pre[data-sig]')
      sig.appendChild(document.createTextNode(pubs.keys.signing.pem))
      const sigJwk = document.querySelector('pre[data-sig-jwk]')
      sigJwk.appendChild(document.createTextNode(pubs.keys.signing.jwk))
      const enc = document.querySelector('pre[data-enc]')
      enc.appendChild(document.createTextNode(pubs.keys.encrypting.pem))
      const encJwk = document.querySelector('pre[data-enc-jwk]')
      encJwk.appendChild(document.createTextNode(pubs.keys.encrypting.jwk))
    } else {
      parent.appendChild(document.createTextNode(pubs.error))
    }
  })
}

function createKeysAdmin(link) {
  link.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const opts = {
      method: 'GET',
      headers: {
        CsrfToken: csrfToken,
        Accept: 'application/json',
        Authorization: `Bearer ${jwtAccess}`,
      },
    }
    const url = link.dataset.href
    const request = new Request(url, opts)
    const response = await fetch(request, { credentials: 'same-origin' })
    const pubs = await response.json()
    console.log(pubs)
    const parent = e.target.parentNode
    if (pubs.status === 'success') {
      const ahref = document.createElement('a')
      ahref.href = pubs.url
      ahref.dataset.id = 'jwks.json'
      ahref.appendChild(document.createTextNode(pubs.url))
      parent.innerHTML = ''
      parent.appendChild(ahref)
    } else {
      parent.appendChild(document.createTextNode(pubs.error))
    }
  })
}
