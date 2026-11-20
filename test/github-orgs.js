'use strict'

const assert = require('assert')

const { isMemberOfRequiredOrg } = require('../lib/web/auth/github/orgs')

function fakeResponse (status, body) {
  return {
    status,
    json: () => Promise.resolve(body)
  }
}

function fakeFetch (responses) {
  const calls = []
  const fn = (url, options) => {
    calls.push({ url, options })
    const org = decodeURIComponent(url.split('/').pop())
    const response = responses[org]
    if (response instanceof Error) {
      return Promise.reject(response)
    }
    return Promise.resolve(response || fakeResponse(404, { message: 'Not Found' }))
  }
  fn.calls = calls
  return fn
}

describe('GitHub organization membership check', function () {
  it('accepts an active member', async function () {
    const fetch = fakeFetch({ myorg: fakeResponse(200, { state: 'active' }) })
    assert.strictEqual(await isMemberOfRequiredOrg('token', ['myorg'], 'user', fetch), true)
    assert.strictEqual(fetch.calls[0].url, 'https://api.github.com/user/memberships/orgs/myorg')
    assert.strictEqual(fetch.calls[0].options.headers.Authorization, 'token token')
    assert.strictEqual(fetch.calls[0].options.headers['User-Agent'], 'HedgeDoc')
  })

  it('rejects a pending membership', async function () {
    const fetch = fakeFetch({ myorg: fakeResponse(200, { state: 'pending' }) })
    assert.strictEqual(await isMemberOfRequiredOrg('token', ['myorg'], 'user', fetch), false)
  })

  it('rejects a non-member (404)', async function () {
    const fetch = fakeFetch({})
    assert.strictEqual(await isMemberOfRequiredOrg('token', ['myorg'], 'user', fetch), false)
  })

  it('rejects when access is denied (403)', async function () {
    const fetch = fakeFetch({ myorg: fakeResponse(403, { message: 'restricted' }) })
    assert.strictEqual(await isMemberOfRequiredOrg('token', ['myorg'], 'user', fetch), false)
  })

  it('rejects on unexpected status codes and network errors', async function () {
    const fetch = fakeFetch({ a: fakeResponse(500, {}), b: new Error('ECONNRESET') })
    assert.strictEqual(await isMemberOfRequiredOrg('token', ['a', 'b'], 'user', fetch), false)
  })

  it('rejects on unparsable responses', async function () {
    const fetch = fakeFetch({ myorg: { status: 200, json: () => Promise.reject(new SyntaxError('bad json')) } })
    assert.strictEqual(await isMemberOfRequiredOrg('token', ['myorg'], 'user', fetch), false)
  })

  it('accepts membership in any one of several organizations', async function () {
    const fetch = fakeFetch({ second: fakeResponse(200, { state: 'active' }) })
    assert.strictEqual(await isMemberOfRequiredOrg('token', ['first', 'second', 'third'], 'user', fetch), true)
    // stops querying after the first match
    assert.strictEqual(fetch.calls.length, 2)
  })

  it('url-encodes organization names', async function () {
    const fetch = fakeFetch({})
    await isMemberOfRequiredOrg('token', ['../users'], 'user', fetch)
    assert.strictEqual(fetch.calls[0].url, 'https://api.github.com/user/memberships/orgs/..%2Fusers')
  })

  it('rejects when no organizations are given', async function () {
    const fetch = fakeFetch({})
    assert.strictEqual(await isMemberOfRequiredOrg('token', [], 'user', fetch), false)
    assert.strictEqual(fetch.calls.length, 0)
  })
})
