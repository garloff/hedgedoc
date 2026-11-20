# Authentication guide - GitHub

1. Sign-in or sign-up for a GitHub account

2. Navigate to developer settings in your GitHub account [here](https://github.com/settings/developers) and select the "OAuth Apps" tab

3. Click on the **New OAuth App** button, to create a new OAuth App:  
   ![create-oauth-app](../../images/auth/create-oauth-app.png)

4. Fill out the new OAuth application registration form, and click **Register Application**  
   ![register-oauth-application-form](../../images/auth/register-oauth-application-form.png)

   **Note:** *The callback URL is <your-hedgedoc-url>/auth/github/callback*

5. After successfully registering the application, you'll receive the Client ID and Client Secret for the application  
   ![application-page](../../images/auth/application-page.png)

6. Add the Client ID and Client Secret to your config.json file or pass them as environment variables
  - `config.json`:
    ```json
    {
      "production": {
        "github": {
          "clientID": "3747d30eaccXXXXXXXXX",
          "clientSecret": "2a8e682948eee0c580XXXXXXXXXXXXXXXXXXXXXX"
        }
      }
    }
    ```

  - environment variables:
    ```shell
    CMD_GITHUB_CLIENTID=3747d30eaccXXXXXXXXX
    CMD_GITHUB_CLIENTSECRET=2a8e682948eee0c580XXXXXXXXXXXXXXXXXXXXXX
    ```

## Restricting login to organization members

By default, every GitHub user can log in. To allow only members of certain GitHub organizations, list them in
`requiredOrgs` (or `CMD_GITHUB_REQUIREDORGS`, comma-separated). A user needs to be an active member of at least one of
the listed organizations.

- `config.json`:
  ```json
  {
    "production": {
      "github": {
        "clientID": "3747d30eaccXXXXXXXXX",
        "clientSecret": "2a8e682948eee0c580XXXXXXXXXXXXXXXXXXXXXX",
        "requiredOrgs": ["my-org", "other-org"]
      }
    }
  }
  ```

- environment variables:
  ```shell
  CMD_GITHUB_REQUIREDORGS=my-org,other-org
  ```

Notes:

- HedgeDoc additionally requests the `read:org` scope, so that private (concealed) memberships can be checked as well.
  Users who authorized HedgeDoc before will be asked once to grant this additional scope.

- If an organization has [OAuth app access restrictions](https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions)
  enabled (the default for new organizations), HedgeDoc can't see memberships until an organization owner approves the
  OAuth app. OAuth apps owned by the organization itself are approved automatically. Denied lookups are logged as
  warnings.

- Membership is only checked when logging in. Users who leave an organization stay logged in until their session
  expires (see `sessionLife`).

- Restricting the login does not restrict anonymous access. Review `allowAnonymous`, `allowAnonymousEdits` and
  `defaultPermission` as well.
