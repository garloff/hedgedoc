'use strict'

const logger = require('../../../logger')

const GITHUB_API_URL = 'https://api.github.com'

/**
 * Checks whether the user owning the given access token is an active member of
 * at least one of the given GitHub organizations.
 *
 * Uses GET /user/memberships/orgs/{org}, which requires the `read:org` scope and
 * also reports private (concealed) memberships.
 *
 * @param {string} accessToken OAuth access token of the user
 * @param {string[]} requiredOrgs list of organization logins, membership in one of them is sufficient
 * @param {string} username GitHub login of the user, only used for logging
 * @param {Function} [fetchImpl] fetch implementation, overridable for testing
 * @returns {Promise<boolean>} true if the user is an active member of at least one organization
 */
async function isMemberOfRequiredOrg (accessToken, requiredOrgs, username, fetchImpl = fetch) {
  for (const org of requiredOrgs) {
    let resp
    try {
      resp = await fetchImpl(`${GITHUB_API_URL}/user/memberships/orgs/${encodeURIComponent(org)}`, {
        headers: {
          'User-Agent': 'HedgeDoc',
          Authorization: 'token ' + accessToken,
          Accept: 'application/vnd.github+json'
        }
      })
    } catch (err) {
      logger.error(`github: failed to query membership of "${username}" in organization "${org}": ${err}`)
      continue
    }

    if (resp.status === 200) {
      let membership
      try {
        membership = await resp.json()
      } catch (err) {
        logger.error(`github: failed to parse membership response for organization "${org}": ${err}`)
        continue
      }
      if (membership && membership.state === 'active') {
        return true
      }
      logger.debug(`github: membership of "${username}" in organization "${org}" is not active (state: ${membership && membership.state})`)
    } else if (resp.status === 404) {
      logger.debug(`github: user "${username}" is not a member of organization "${org}"`)
    } else if (resp.status === 403) {
      logger.warn(`github: access to membership of "${username}" in organization "${org}" was denied (HTTP 403). ` +
        'If the organization uses OAuth app access restrictions, an organization owner has to approve the HedgeDoc OAuth app.')
    } else {
      logger.error(`github: unexpected HTTP ${resp.status} while querying membership of "${username}" in organization "${org}"`)
    }
  }
  return false
}

exports.isMemberOfRequiredOrg = isMemberOfRequiredOrg
