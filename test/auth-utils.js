'use strict'

const assert = require('assert')

const models = require('../lib/models')
const { passportGeneralCallback } = require('../lib/web/auth/utils')

function login (providerName, profile) {
  return new Promise((resolve, reject) => {
    passportGeneralCallback(providerName)('accessToken', undefined, profile, (err, user) => {
      if (err) {
        return reject(err)
      }
      resolve(user)
    })
  })
}

describe('passportGeneralCallback', function () {
  beforeEach(() => {
    return models.sequelize.sync({ force: true })
  })

  it('creates a new user with profile id and provider', async function () {
    const user = await login('github', { id: 4242, username: 'alice' })
    assert.strictEqual(user.profileid, '4242')
    assert.strictEqual(user.profileProvider, 'github')
  })

  it('returns the same user on repeated logins', async function () {
    const first = await login('github', { id: 4242, username: 'alice' })
    const second = await login('github', { id: 4242, username: 'alice' })
    assert.strictEqual(second.id, first.id)
    assert.strictEqual(await models.User.count(), 1)
  })

  it('adopts existing users without a profile provider', async function () {
    const existing = await models.User.create({ profileid: '4242', profile: '{}' })
    const user = await login('github', { id: 4242, username: 'alice' })
    assert.strictEqual(user.id, existing.id)
    assert.strictEqual(user.profileProvider, 'github')
  })

  it('does not mix up users of different providers with the same profile id', async function () {
    const github = await login('github', { id: 4242, username: 'alice' })
    const gitlab = await login('gitlab', { id: 4242, username: 'mallory' })
    assert.notStrictEqual(gitlab.id, github.id)
  })
})
