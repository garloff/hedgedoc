'use strict'
import Scrypt from 'scrypt-kdf'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { Op } = require('sequelize')
// models are required lazily, since lib/models/user.js imports this module (circular dependency)
const getModels = () => require('../../models')
const logger = require('../../logger')

export const passportGeneralCallback = (providerName) => function callback (accessToken, refreshToken, profile, done) {
  const stringifiedProfile = JSON.stringify(profile)
  const models = getModels()
  models.User.findOrCreate({
    where: {
      [Op.and]: [
        {
          profileid: profile.id.toString()
        },
        {
          profileProvider: {
            [Op.or]: [
              {
                [Op.eq]: providerName
              },
              {
                [Op.eq]: null
              }
            ]
          }
        }
      ]
    },
    defaults:
      {
        // must be set explicitly, findOrCreate doesn't copy values nested in Op.and into the new row
        profileid: profile.id.toString(),
        profile: stringifiedProfile,
        profileProvider: providerName,
        accessToken,
        refreshToken
      }
  }).spread(function (user, created) {
    if (user) {
      let needSave = false
      if (user.profile !== stringifiedProfile) {
        user.profile = stringifiedProfile
        needSave = true
      }
      if (user.accessToken !== accessToken) {
        user.accessToken = accessToken
        needSave = true
      }
      if (user.refreshToken !== refreshToken) {
        user.refreshToken = refreshToken
        needSave = true
      }
      if (user.profileProvider === null) {
        user.profileProvider = providerName
        needSave = true
      }
      if (needSave) {
        user.save().then(function () {
          logger.debug(`user login: ${user.id}`)
          return done(null, user)
        })
      } else {
        logger.debug(`user login: ${user.id}`)
        return done(null, user)
      }
    }
  }).catch(function (err) {
    logger.error('auth callback failed: ' + err)
    return done(err, null)
  })
}

export async function verifyPassword (input, hashed) {
  try {
    return (await Scrypt.verify(Buffer.from(hashed, 'hex'), input))
  } catch (error) {
    logger.error(`Error during login: ${error}`)
    return false
  }
}
