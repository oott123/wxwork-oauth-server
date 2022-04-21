import { Request, Response } from 'express'

export function safeCall(fn: (req: Request, res: Response) => Promise<any>) {
  return async (req2: Request, res2: Response) => {
    try {
      return await fn(req2, res2)
    } catch (e) {
      return res2.render('message', {
        title: 'Internal Error',
        message: String(e),
        messageTitle: 'Internal Error',
      })
    }
  }
}
