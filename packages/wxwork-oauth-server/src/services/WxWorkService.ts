import fetch from 'node-fetch'

export interface IAccessInfo {
  userId?: string
  deviceId?: string
  openId?: string
}

export class WxWorkService {
  private corpId: string
  private agentId: string
  private corpSecret: string
  private accessToken: string
  private accessTokenExpiresAt: number

  constructor(corpId: string, agentId: string, corpSecret: string) {
    this.corpId = corpId
    this.agentId = agentId
    this.corpSecret = corpSecret
  }

  private async updateAccessToken(): Promise<void> {
    const res = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.corpId}&corpsecret=${encodeURIComponent(
        this.corpSecret,
      )}`,
    )

    const json = await res.json()
    this.checkError(json)

    this.accessToken = json.access_token
    this.accessTokenExpiresAt = Date.now() + json.expires_in * 1000
  }

  public async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessTokenExpiresAt > Date.now() + 30000) {
      return this.accessToken
    }
    await this.updateAccessToken()
    return this.accessToken
  }

  public async getAccessInfo(code: string): Promise<IAccessInfo> {
    const accessToken = await this.getAccessToken()

    const res = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${encodeURIComponent(
        accessToken,
      )}&code=${encodeURIComponent(code)}`,
    )

    const json = await res.json()
    this.checkError(json)

    return {
      userId: json.UserId,
      deviceId: json.DeviceId,
      openId: json.OpenId,
    }
  }

  public async getUser(userId: string): Promise<any> {
    const accessToken = await this.getAccessToken()

    const res = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${encodeURIComponent(
        accessToken,
      )}&userid=${encodeURIComponent(userId)}`,
    )

    const json = await res.json()
    this.checkError(json)

    return json
  }

  public getInAppOauthUrl(redirectUrl: string, state?: string): string {
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(
      this.corpId,
    )}&redirect_uri=${redirectUrl}&response_type=code&scope=snsapi_base&state=${encodeURIComponent(
      state,
    )}#wechat_redirect`
  }

  public getWebOauthUrl(redirectUrl: string, state?: string): string {
    return `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${encodeURIComponent(
      this.corpId,
    )}&agentid=${encodeURIComponent(this.agentId)}&redirect_uri=${encodeURIComponent(
      redirectUrl,
    )}&state=${encodeURIComponent(state)}`
  }

  private checkError(json: any) {
    if (json.errcode !== 0) {
      throw new Error(json.errmsg)
    }
  }
}
