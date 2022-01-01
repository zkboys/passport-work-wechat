# @zkboys/passport-work-wechat

[Passport](http://passportjs.org/) strategy for authenticating with [Wechat Work Accounts](https://work.weixin.qq.com/)
using the OAuth 2.0 API.

非企业微信浏览器扫码登录，企业微信浏览器使用网页授权

## 安装

```bash
$ npm install @zkboys/passport-work-wechat
```

## 使用

#### 配置

- 在Passport注册WorkWechatStrategy, Passport.use()的第一个参数是name，可以忽略使用默认的名字’workWechat'。WorkWechatStrategy的构造函数的参数是options,verify 以及getAccessToken和saveAccessToken。

  options的corpId，corpSecret, agentId和callbackURL是必需的，其他为可选。verify函数是验证或创建用户传给done函数, getAccessToken和saveAccessToken用已获得AccessToken和保存新的AccessToken，当`getAccessToken`返回的AccessToken无效时，会通过调用微信的`/gettoken`接口获取新的AccessToken，并用`saveAccessToken`
  进行保存。`getAccessToken` and `saveAccessToken` 都是必需的。 options的href 可以用来传递微信企业二维码链接的css美化，可参考v.qq.com的微信登录链接

```
passport.use("workWechat",new WorkWechatStrategy({
    corpId: CORP_ID,
    corpSecret: CORP_SECRET,
    agentId: agent_id,
    callbackURL: "http://localhost:3000/auth/wechat/callback",
    href: href,
    state: "state",
    scope: "snsapi_base",
  },
  function(profile, done) {
    User.findOrCreate({ userId: profile.UserId }, function (err, user) {
      return done(err, user);
    });
  },
  async function getAccessToken() { ... },
  async function saveAccessToken(accessToken){ ... }
))
```

#### Authenticate Requests

用`passport.authenticate()`在对应的route下，注意strategy名字和passport.use()时一致。

For example

```
app.get('/auth/wechatwork',
  passport.authenticate('workWechat'));

app.get('/auth/wechatwork/callback',
  passport.authenticate('workWechat', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
```

## Additional

- 微信企业用户验证只获得了用户基本信息，实际只获得了id，需要详细的用户信息仍需要调用微信的Users API.

```
{
   "UserId":"USERID",
   "DeviceId":"DEVICEID"
}
```
