import { FeishuService } from './FeishuService'
import { WxWorkService } from './WxWorkService'

export interface IUserInfo {
  enabled: boolean
  email: string
  sub: string
  username: string
  gender: number // 0表示未定义，1表示男性，2表示女性。
  name: string
  alias: string
  mobile: string
  telephone: string
  avatar: string
  thumb_avatar: string
}

export class UserService {
  constructor(private feishu: FeishuService, private wxWork: WxWorkService) {}

  public async getUser(vendor: string, userId: string) {
    if (vendor === 'feishu') {
      return this.parseFeishu(await this.feishu.getUserContact(userId))
    } else {
      return this.parseWxWork(await this.wxWork.getUser(userId))
    }
  }

  private parseFeishu(user: any): IUserInfo {
    const email = `${user.enterprise_email}`.toLowerCase()
    const username = getUsernameFromEmail(email)

    return {
      enabled:
        user.status?.is_activated &&
        !user.status?.is_frozen &&
        !user.status?.is_resigned &&
        !user.status?.is_unjoin &&
        !user.status?.is_exited,
      email,
      sub: username,
      username,
      gender: user.gender,
      name: user.name,
      alias: '',
      mobile: normalizeMobile(user.mobile),
      telephone: '',
      avatar: user.avatar.avatar_origin,
      thumb_avatar: user.avatar.avatar_640,
    }
  }

  private parseWxWork(user: any): IUserInfo {
    return {
      enabled: user.status === 1,
      email: `${user.email}`.toLowerCase(),
      sub: `${user.userid}`.toLowerCase(),
      username: `${user.userid}`.toLowerCase(),
      gender: Number(user.gender),
      name: user.name,
      alias: user.alias,
      mobile: user.mobile,
      telephone: user.telephone,
      avatar: user.avatar,
      thumb_avatar: user.thumb_avatar,
    }
  }
}

function getUsernameFromEmail(email: string) {
  return email.split('@')[0]
}

function normalizeMobile(mobile: string) {
  if (mobile.startsWith('+86')) {
    return mobile.substr(3)
  }
}
