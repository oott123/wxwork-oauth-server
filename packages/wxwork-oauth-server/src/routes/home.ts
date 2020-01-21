import { Express } from 'express'
import Provider from 'oidc-provider'

export function home(app: Express, provider: Provider) {
  app.get('/', async (req, res) => {
    const ctx = provider.app.createContext(req, res)
    const session = await provider.Session.get(ctx)

    res.render('home', { user: session.account || req.session.userId })
  })
}
