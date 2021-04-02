import { Express } from 'express'
import Provider from 'oidc-provider'
import { WxWorkService } from '../services/WxWorkService'

export function workAuth(app: Express, provider: Provider, wxWork: WxWorkService) {
  app.get('/interaction/:uid', async (req, res) => {
    const details = await provider.interactionDetails(req, res)

    switch (details.prompt.name) {
      case 'login': {
        if (req.session.userId) {
          return provider.interactionFinished(
            req,
            res,
            {
              login: {
                account: req.session.userId,
              },
              consent: {
                rejectedClaims: [],
                rejectedScopes: [],
                replace: false,
              },
            },
            { mergeWithLastSubmission: false },
          )
        }

        req.session.uid = details.uid

        return doOauth(req, wxWork, res)
      }
      case 'consent': {
        await provider.interactionFinished(
          req,
          res,
          {
            consent: {
              rejectedClaims: [],
              rejectedScopes: [],
              replace: false,
            },
          },
          { mergeWithLastSubmission: true },
        )
        return
      }
    }
    res.end()
  })

  app.get('/login', (req, res) => {
    req.session.uid = undefined
    return doOauth(req, wxWork, res)
  })

  app.get('/wxwork-callback', async (req, res) => {
    const state = req.query.state
    if (state !== req.session.state) {
      return res.end('state mismatch')
    }

    const code = req.query.code
    const info = await wxWork.getAccessInfo(code)

    if (!info.userId) {
      return res.render('message', {
        title: 'Unauthorized',
        message: 'You are not authorized to this service.',
        messageTitle: 'Unauthorized',
      })
    }

    const uid = req.session.uid
    req.session.uid = undefined

    req.session.userId = info.userId

    if (uid) {
      return res.redirect(`/interaction/${uid}`)
    } else {
      return res.redirect('/')
    }
  })
}

function doOauth(req, wxWork: WxWorkService, res) {
  const redirectUrl = `${process.env.BASE_URL}/wxwork-callback`
  const state = Math.random()
    .toString()
    .slice(2)
  const oauthUrl = /wxwork\//.exec(req.header('User-Agent'))
    ? wxWork.getInAppOauthUrl(redirectUrl, state)
    : wxWork.getWebOauthUrl(redirectUrl, state)
  req.session.state = state
  res.redirect(oauthUrl)
}
