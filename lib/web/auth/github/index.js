'use strict'

const Router = require('express').Router
const passport = require('passport')
const GithubStrategy = require('passport-github').Strategy
const config = require('../../../config')
const logger = require('../../../logger')
const response = require('../../../response')
const { passportGeneralCallback } = require('../utils')
const { isMemberOfRequiredOrg } = require('./orgs')

const githubAuth = module.exports = Router()

const generalCallback = passportGeneralCallback('github')
const requiredOrgs = (config.github.requiredOrgs || []).filter(org => org)

function githubVerifyCallback (accessToken, refreshToken, profile, done) {
  if (requiredOrgs.length === 0) {
    return generalCallback(accessToken, refreshToken, profile, done)
  }
  isMemberOfRequiredOrg(accessToken, requiredOrgs, profile.username).then(isMember => {
    if (!isMember) {
      logger.info(`github: user "${profile.username}" is not an active member of any required organization. Permission denied`)
      return done(null, false, { message: 'Your GitHub account is not a member of an organization that is allowed to use this HedgeDoc instance.' })
    }
    return generalCallback(accessToken, refreshToken, profile, done)
  }, err => {
    logger.error(`github: organization membership check failed: ${err}`)
    return done(null, false, { message: 'Could not verify your GitHub organization membership.' })
  })
}

passport.use(new GithubStrategy({
  clientID: config.github.clientID,
  clientSecret: config.github.clientSecret,
  callbackURL: config.serverURL + '/auth/github/callback',
  // read:org is needed to see (also private) organization memberships
  scope: requiredOrgs.length > 0 ? ['read:org'] : undefined,
  pkce: true,
  state: true
}, githubVerifyCallback))

githubAuth.get('/auth/github', function (req, res, next) {
  passport.authenticate('github')(req, res, next)
})

// github auth callback
githubAuth.get('/auth/github/callback',
  passport.authenticate('github', {
    successReturnToOrRedirect: config.serverURL + '/',
    failureRedirect: config.serverURL + '/',
    failureFlash: true
  })
)

// github callback actions
githubAuth.get('/auth/github/callback/:noteId/:action', response.githubActions)
