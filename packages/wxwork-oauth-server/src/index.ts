import { Provider } from 'oidc-provider'
import * as Express from 'express'
import cookieSession = require('cookie-session')
import { workAuth } from './routes/workAuth'
import { WxWorkService } from './services/WxWorkService'
import { readFileSync } from 'fs'
import { home } from './routes/home'
import { FeishuService } from './services/FeishuService'
import { UserService } from './services/UserService'

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
const feishu = new FeishuService(process.env.APP_ID, process.env.APP_SECRET)
const userService = new UserService(feishu, wxWork)

const baseUrl = process.env.BASE_URL
const jwks = JSON.parse(readFileSync(process.env.JWK_FILE).toString())
const clients = JSON.parse(readFileSync(process.env.CLIENTS_FILE).toString())

const provider = new Provider(baseUrl, {
  clients: clients,
  cookies: {
    keys: [process.env.COOKIE_SECRET_KEY],
  },
  async findAccount(ctx, id) {
    const [vendor, userId] = id.split(':')
    try {
      const user = await userService.getUser(vendor, userId)
      if (user && user.enabled) {
        return {
          accountId: id,
          claims() {
            return { ...user }
          },
        }
      }
    } catch (e) {
      console.error(e)
      throw e
    }
  },
  features: {
    devInteractions: {
      enabled: false,
    },
    rpInitiatedLogout: {
      logoutSource: (ctx: any, form: string) => {
        ctx.res.render('logout', {
          form,
        })
      },
      postLogoutSuccessSource: (ctx: any) => {
        ctx.res.render('message', {
          title: 'Sign Out',
          messageTitle: 'Sign Out',
          message: 'You have been signed out successfully.',
        })
      },
    },
  },
  scopes: ['openid', 'offline_access', 'email', 'name', 'mobile', 'avatar'],
  claims: {
    email: ['email'],
    openid: ['sub', 'username', 'gender'],
    name: ['name', 'alias'],
    mobile: ['mobile', 'telephone'],
    avatar: ['avatar', 'thumb_avatar'],
  },
  jwks,
  renderError: (ctx: any, out, error) => {
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
})

provider.proxy = !!process.env.TRUST_PROXY
provider.on('end_session.success', (ctx: any) => {
  ctx.req.session.userId = ''
  ctx.req.session.uid = ''
})

workAuth(app, provider, wxWork, feishu)
home(app, provider, userService)

app.use(provider.callback)

app.listen(process.env.PORT)
