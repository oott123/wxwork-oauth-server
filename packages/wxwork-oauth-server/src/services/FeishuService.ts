import fetch from 'node-fetch'

export class FeishuService {
  private appAccessToken: string
  private appAccessTokenExpiresAt: number

  constructor(private appId: string, private appSecret: string) {}

  public getOauthUrl(redirectUrl: string, state?: string) {
    return `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${encodeURIComponent(
      this.appId,
    )}&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(state)}`
  }

  public async getUserContact(
    open_id: string,
  ): Promise<{
    avatar: {
      avatar_72: string
      avatar_240: string
      avatar_640: string
      avatar_origin: string
    }
    enterprise_email: string
    name: string
    gender: number
    mobile: string
  }> {
    const appAccessToken = await this.getAppAccessToken()
    const res = await fetch(`https://open.feishu.cn/open-apis/contact/v3/users/${open_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const json = await res.json()
    handleJson('get user contact', json)

    return json?.data?.user
  }

  public async getUserAccessByCode(code: string): Promise<{ access_token: string; open_id: string }> {
    const appAccessToken = await this.getAppAccessToken()

    const res = await fetch(`https://open.feishu.cn/open-apis/authen/v1/access_token`, {
      method: 'POST',
      body: JSON.stringify({ code, grant_type: 'authorization_code' }),
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const json = await res.json()
    handleJson('get user access', json)

    return json?.data
  }

  private async getAppAccessToken() {
    if (this.appAccessToken && this.appAccessTokenExpiresAt > Date.now() + 30000) {
      return this.appAccessToken
    }

    const res = await fetch(`https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal`, {
      method: 'POST',
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const json = await res.json()
    if (json.code !== 0) {
      throw new Error('get tenant access token failed ' + json.msg)
    }

    this.appAccessToken = json.tenant_access_token
    this.appAccessTokenExpiresAt = Date.now() + json.expire * 1000

    return this.appAccessToken
  }
}

function handleJson(m: string, y: any) {
  if (y.code !== 0) {
    throw new Error(`${m} feishu error: (${y.code}) ${y.msg}`)
  }
}
