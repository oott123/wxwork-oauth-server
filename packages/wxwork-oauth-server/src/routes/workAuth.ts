import { Express } from 'express'
import Provider from 'oidc-provider'
import { FeishuService } from '../services/FeishuService'
import { WxWorkService } from '../services/WxWorkService'
import { safeCall } from './safeCall'

export function workAuth(app: Express, provider: Provider, wxWork: WxWorkService, feishu: FeishuService) {
  app.get('/interaction/:uid', async (req, res) => {
    const details = await provider.interactionDetails(req, res)

    switch (details.prompt.name) {
      case 'login': {
        const { userId, vendor } = req.session
        if (userId && vendor) {
          return provider.interactionFinished(
            req,
            res,
            {
              login: {
                account: `${vendor}:${userId}`,
                remember: true,
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
        if (req.query.vendor) {
          return doOauth(req, wxWork, feishu, res)
        }

        req.session.uid = details.uid
        const state = Math.random()
          .toString(36)
          .slice(2)
        req.session.state = state

        return res.render('vendor')
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
    const state = Math.random()
      .toString(36)
      .slice(2)
    req.session.state = state

    if (req.query.vendor) {
      return doOauth(req, wxWork, feishu, res)
    } else {
      return res.render('vendor')
    }
  })

  app.get(
    '/wxwork-callback',
    safeCall(async (req, res) => {
      const state = req.query.state
      if (state !== req.session.state) {
        return res.end('state mismatch')
      }
      req.session.state = undefined

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
      req.session.vendor = 'wxwork'

      if (uid) {
        return res.redirect(`/interaction/${uid}`)
      } else {
        return res.redirect('/')
      }
    }),
  )

  app.get(
    '/feishu-callback',
    safeCall(async (req, res) => {
      const state = req.query.state
      if (state !== req.session.state) {
        return res.end('state mismatch')
      }
      req.session.state = undefined

      const code = req.query.code
      const info = await feishu.getUserAccessByCode(code)

      if (!info.access_token || !info.access_token) {
        return res.render('message', {
          title: 'Unauthorized',
          message: 'You are not authorized to this service.',
          messageTitle: 'Unauthorized',
        })
      }

      const uid = req.session.uid
      req.session.uid = undefined

      req.session.userId = info.open_id
      req.session.vendor = 'feishu'

      if (uid) {
        return res.redirect(`/interaction/${uid}`)
      } else {
        return res.redirect('/')
      }
    }),
  )
}

function doOauth(req, wxWork: WxWorkService, feishu: FeishuService, res) {
  const vendor = req.query.vendor
  const state = req.session.state
  if (vendor === 'wxwork') {
    const redirectUrl = `${process.env.BASE_URL}/wxwork-callback`
    const oauthUrl = /wxwork\//.exec(req.header('User-Agent'))
      ? wxWork.getInAppOauthUrl(redirectUrl, state)
      : wxWork.getWebOauthUrl(redirectUrl, state)
    return res.redirect(oauthUrl)
  } else if (vendor === 'feishu') {
    const redirectUrl = `${process.env.FEISHU_BASE_URL || process.env.BASE_URL}/feishu-callback`
    const oauthUrl = feishu.getOauthUrl(redirectUrl, state)
    return res.redirect(oauthUrl)
  } else {
    return res.render('message', {
      title: 'Bad Request',
      message: 'Unknown vendor',
      messageTitle: 'Bad Request',
    })
  }
}
