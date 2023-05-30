function createKeysUser(link) {
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
    // const pubs = {
    //   status: 'success',
    //   url: 'https://mattmadethese.com/.well-known/jwks.json',
    //   keys: {
    //     signing: {
    //       pem: '-----BEGIN PUBLIC KEY-----\n' +
    //   '3zP69L61lKqlWZebo0UQO/53opwALi8f1GlInYJjBpGJzvEBoI64IUCXl5J6fZ/C\n' +
    //   '-----END PUBLIC KEY-----',
    //       jwk: '{\n' +
    //   '  "key_ops":["verify"],\n' +
    //   '  "ext":true,\n' +
    //   '  "kty":"RSA",\n' +
    //   '  "n":"wrWDldasnSQ71tSPEnYKGTBeSVZ45CMnNaH4z_g6Zw9x1LvC2iI3mwJ9Ak4JXJt2\n' +
    //   '  XR4lN5m2MUpGdS4vnalUKYepSfjDzdrbaePcqm82r1XXJzBlfcnHYMGIDCIuc7tE\n' +
    //   '  AWdLTcbC4MKFaVU5T-vgrXXUCyUqH9qwx5dMxk3Onb1NNUawXSn87A6skHLq463S\n' +
    //   '  9F6aW3jH2sjyGaZxbvv-9MifX7JASwFQU8jM8WFHSi04gROqa4MVpAxe_7OUPQ7i\n' +
    //   '  80x7lOzHht_6tTQY8JlH3zP69L61lKqlWZebo0UQO_53opwALi8f1GlInYJjBpGJ\n' +
    //   '  zvEBoI64IUCXl5J6fZ_C0Q",\n' +
    //   '  "e":"AQAB",\n' +
    //   '  "alg":"RS256"\n' +
    //   '  "kid":"1b090175-261d-4a02-870e-8fe3728001f8",\n' +
    //   '}',
    //     },
    //     encrypting: {
    //       pem: '-----BEGIN PUBLIC KEY-----\n' +
    //   'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0YVfFxq3Aj7AJj8mosIL\n' +
    //   '-----END PUBLIC KEY-----',
    //       jwk: '{\n' +
    //   '  "key_ops":["encrypt"],\n' +
    //   '  "ext":true,\n' +
    //   '  "kty":"RSA",\n' +
    //   '  "n":"0YVfFxq3Aj7AJj8mosILPfM616CbA56nIyGCTHpaeO5NMtlqqi-EMrdpyD6oN1N5\n' +
    //   '  IqKo9dlNUB_EuAcB3E1H-jYdTc7x_SM517OkAN1F-cdmNwVYgU9Cvji5x2-9RXAW\n' +
    //   '  V-M_Gkpof-H6q0PF0lynXx9UkUzaxX5emQmRKTrUMkWPENIgr2GNuKiG3HFvwIco\n' +
    //   '  Yh9JiKRiDHDkWU1oTcsUe6d7t8z_MtLo6rhKBviYmSw0zI0I6U0O4kZl30W9z_Zf\n' +
    //   '  hh2dmnweUxgnLEE8ve59CJVpPkBmIdZJ00AHpNZoGBsptMmUdCHwxlLfKWbYUmbe\n' +
    //   '  qWP_eUC7lTYx-aRFehrnxQ",\n' +
    //   '  "e":"AQAB",\n' +
    //   '  "alg":"RSA-OAEP-256"\n' +
    //   '  "kid":"1cb2a3c8-1cc1-4885-8a91-0be786c276a3",\n' +
    //   '}',
    //     },
    //   },
    // }
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
        Accept: 'application/json',
        CsrfToken: csrfToken,
      },
    }
    const url = link.dataset.href
    const request = new Request(url, opts)
    const response = await fetch(request)
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
