import { Provider } from 'oidc-provider'
import * as Express from 'express'
import cookieSession = require('cookie-session')
import { workAuth } from './routes/workAuth'
import { WxWorkService } from './services/WxWorkService'
import { readFileSync } from 'fs'
import { home } from './routes/home'

require('dotenv').config()

const app = Express()
app.set('views', './src/views')
app.set('view engine', 'ejs')
app.use(
  cookieSession({
    name: 'wxwork-oauth',
    keys: [process.env.COOKIE_SECRET_KEY],
    maxAge: 21 * 24 * 60 * 60 * 1000,
  }),
)

const wxWork = new WxWorkService(process.env.CORP_ID, process.env.AGENT_ID, process.env.CORP_SECRET)

const baseUrl = process.env.BASE_URL
const jwks = JSON.parse(readFileSync(process.env.JWK_FILE).toString())
const clients = JSON.parse(readFileSync(process.env.CLIENTS_FILE).toString())

const provider = new Provider(baseUrl, {
  clients: clients,
  cookies: {
    keys: [process.env.COOKIE_SECRET_KEY],
  },
  async findAccount(ctx, id) {
    const user = await wxWork.getUser(id)
    if (user.enable && user.userid == id) {
      return {
        accountId: id,
        claims() {
          return { ...user, sub: id, username: id }
        },
      }
    }
  },
  features: {
    devInteractions: {
      enabled: false,
    },
  },
  claims: {
    email: ['email'],
    openid: ['sub', 'username', 'avatar', 'thumb_avatar', 'gender'],
    name: ['name', 'alias'],
    mobile: ['mobile', 'telephone'],
  },
  jwks,
  renderError: (ctx, out, error) => {
    if (out.error && out.error_description) {
      ctx.res.render('message', {
        title: 'Error',
        messageTitle: out.error,
        message: out.error_description,
      })
    } else {
      ctx.res.render('message', {
        title: 'Error',
        messageTitle: 'An error occurred',
        message: error,
      })
    }
  },
  postLogoutSuccessSource: ctx => {
    ctx.req.session.userId = undefined
    ctx.req.session.uid = undefined
    ctx.res.render('message', {
      title: 'Sign Out',
      messageTitle: 'Sign Out',
      message: 'You have been signed out successfully.',
    })
  },
})

provider.proxy = !!process.env.TRUST_PROXY

workAuth(app, provider, wxWork)
home(app, provider)

app.use(provider.callback)

app.listen(process.env.PORT)
