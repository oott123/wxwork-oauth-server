# wxwork-oauth-server

[![Docker Repository on Quay](https://quay.io/repository/oott123/wxwork-oauth-server/status "Docker Repository on Quay")](https://quay.io/repository/oott123/wxwork-oauth-server)

使用企业微信验证登录的、符合 OAuth 2.0 和 [OpenID Connect](https://openid.net/connect/) 标准的验证服务器。

## Why

众所周知，企业微信支持 OAuth 2.0 验证。但企业微信的 OAuth 2.0 验证并不标准，包含一些魔改。

例如，在使用 code 换取 access token 的过程中，需要提供应用自己的 access token；而该 access token 需要调用额外的接口才能获取，甚至需要缓存。

再例如，企业微信对应用内、应用外有两套不同的授权页面地址（直接授权登录/扫描二维码），和标准的 OAuth 2.0 也有所区别。

还有，企业微信对一个应用只能设置一个“信任回调域名”，而非 OAuth 2.0 标准的“多个 redirect_url”。

另外，企业微信的网页授权接口，如果应用自己不记住用户鉴权信息，每次登录都需要扫描二维码，无法记住登录，对主要在 PC 上使用的应用而言非常麻烦。

wxwork-oauth-server 作为一个 OAuth 2.0 验证提供者，向下游应用提供授权服务。在登录时， wxwork-oauth-server 会跳转到合适的企业微信授权页面，并最终回到下游应用的页面上。

## Usage

```bash
# 拉取镜像
docker pull quay.io/oott123/wxwork-oauth-server

# 生成 jwk
docker run --rm --name=wxwork-oauth-server \
  quay.io/oott123/wxwork-oauth-server \
  node /app/packages/wxwork-oauth-server/dist/tools/jwk.js > jwk.json

# 复制配置模板
docker run --rm --name=wxwork-oauth-server \
  quay.io/oott123/wxwork-oauth-server \
  cat /app/packages/wxwork-oauth-server/config-examples/clients.json > clients.json
docker run --rm --name=wxwork-oauth-server \
  quay.io/oott123/wxwork-oauth-server \
  cat /app/packages/wxwork-oauth-server/.env.example > .env

# 手动编辑 .env 和 clients.json 以符合你的需求
vim .env clients.json

# 启动容器
docker run --rm --name=wxwork-oauth-server -p 3000:3000 \
  -v $(pwd)/.env:/app/packages/wxwork-oauth-server/.env:ro \
  -v $(pwd)/clients.json:/app/packages/wxwork-oauth-server/clients.json:ro \
  -v $(pwd)/jwk.json:/app/packages/wxwork-oauth-server/jwk.json:ro \
  quay.io/oott123/wxwork-oauth-server
```

访问 `http://localhost:3000/.well-known/openid-configuration` 即可查看 OIDC 发现配置。

### Common Usages

此处给出企业常用的支持 Generic OAuth 的应用配置示例方便使用。

#### GitLab (ominiauth)

```ruby
{
  'name' => 'WxWork',
  'app_id' => 'client',
  'app_secret' => 'secret',
  'args' => {
    authorize_params: { 'scope' => 'openid email name' },
    client_options: {
      'site' => 'https://example.org',
      'user_info_url' => '/me',
      'authorize_url' => '/auth',
      'token_url' => '/token',
    },
    user_response_structure: {
      root_path: [],
      id_path: 'username',
      attributes: { nickname: 'username', email: 'email', name: 'name', first_name: 'name' },
    },
    name: 'WxWork',
    strategy_class: 'OmniAuth::Strategies::OAuth2Generic'
  }
}
```

#### Grafana

```ini
[auth.generic_oauth]
enabled = true
name = 员工登录
allow_sign_up = true
client_id = client
client_secret = secret
scopes = openid email name
email_attribute_name = email
auth_url = https://example.org/auth
token_url = https://example.org/token
api_url = https://example.org/me
```

### Scopes

不同 scope 能获取的信息范围不同。

具体字段定义请参考[企业微信开发文档](https://work.weixin.qq.com/api/doc/90000/90135/90196)，或是[归档](https://web.archive.org/web/20210914125453/https://work.weixin.qq.com/api/doc/90000/90135/90196)以防企业微信调整文档路径。

```js
var scopes = {
  email: ['email'],
  openid: ['sub', 'username', 'avatar', 'thumb_avatar', 'gender'],
  name: ['name', 'alias'],
  mobile: ['mobile', 'telephone'],
};
```

## Notes

* access token 和 refresh token 都存储在内存中，重启会失效
