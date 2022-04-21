import { Express } from 'express'
import Provider from 'oidc-provider'
import { UserService } from '../services/UserService'
import { safeCall } from './safeCall'

export function home(app: Express, provider: Provider, userService: UserService) {
  app.get(
    '/',
    safeCall(async (req, res) => {
      const vendor = req.session.vendor
      const userId = req.session.userId
      const user = vendor && userId && (await userService.getUser(vendor, userId))

      res.render('home', { user, vendor })
    }),
  )
}
