/**
 * Module dependencies.
 */
const passport = require('passport-strategy');
const url = require('url');
const utils = require('./utils');
const OAuth2 = require('./oauth');

module.exports = class WechatWorkStrategy extends passport.Strategy {
  constructor(options, verify, getAccessToken, saveAccessToken) {
    super();

    const {
      webLoginComponent,
      corpId,
      corpSecret,
      agentId,
      callbackURL,
      scope,
      scopeSeparator,
      state,
      passReqToCallback
    } = options;

    if (!verify) {
      throw new Error('WechatWorkStrategy requires a verify callback');
    }

    if (!corpId) {
      throw new Error('WechatWorkStrategy requires a corpId option');
    }
    if (!corpSecret) {
      throw new Error('WechatWorkStrategy requires a corpSecret option');
    }
    if (!agentId) {
      throw new Error('WechatWorkStrategy requires a agentId option');
    }

    const _getAccessToken = getAccessToken || options.getAccessToken;
    const _saveAccessToken = saveAccessToken || options.saveAccessToken;

    if (!_getAccessToken || !_saveAccessToken) {
      throw new Error('WechatWorkStrategy requires \'getAccessToken\' and \'saveAccessToken\'');
    }

    passport.Strategy.call(this);
    this.name = 'workWechat';
    this._verify = verify;
    this._oauth = new OAuth2(corpId, corpSecret, agentId, _getAccessToken, _saveAccessToken);
    this._callbackURL = callbackURL;
    this._scope = scope;
    this._scopeSeparator = scopeSeparator || ' ';
    this._state = state;
    this._passReqToCallback = passReqToCallback;
    this._options = options;
    this._webLoginComponent = webLoginComponent;
  }

  /**
   * Authenticate request by delegating to a service provider using OAuth 2.0.
   *
   * @param {Object} req
   * @param {Object} options
   * @api protected
   */
  async authenticate(req, options = {}) {
    const self = this;
    let callbackURL = this._callbackURL || options.callbackURL;

    if (callbackURL) {
      const parsed = url.parse(callbackURL);
      if (!parsed.protocol) {
        // The callback URL is relative, resolve a fully qualified URL from the
        // URL of the originating request.
        callbackURL = url.resolve(utils.originalURL(req, {
          proxy: this._trustProxy,
        }), callbackURL);
      }
    }

    // 回调
    if (req.query && req.query.code) {
      const {code, state} = req.query;

      const accessToken = await self._oauth.getAccessToken();

      const profile = await self._oauth.getUserInfo(accessToken, code);

      profile.id = profile.userid;
      profile.state = state;
      if (profile.id) {
        verifyResult(profile, verified);
      } else {
        self.fail();
      }
    } else {
      // 跳转到微信鉴权页面
      const params = this._options;

      params.redirect_uri = callbackURL;
      const scope = options.scope || this._scope;

      if (scope) {
        params.scope = scope;
      }

      params.state = options.state || this._state;

      // 获取query中的配置
      if (req.query) {

        Object.keys(params)
          .forEach(key => {
            const value = req.query[key];
            if (value) params[key] = value;
          });

        if (req.query.callbackURL) params.redirect_uri = req.query.callbackURL;
      }

      // 判断是否是企业微信浏览器
      const isWorkWechatBrowser = req.headers['user-agent'].includes('wxwork');

      if (isWorkWechatBrowser) {
        const location = this._oauth.getAuthorizeUrl(params);
        this.redirect(location, 302);
        return;
      }

      // web组件登录 https://developer.work.weixin.qq.com/document/path/98174
      if (this._webLoginComponent) {
        const location = this._oauth.getWWAuthorizeUrl(params);
        this.redirect(location, 302);
        return;
      }

      // 扫码登录
      const location = this._oauth.getQRAuthorizeUrl(params);
      this.redirect(location, 302);
    }

    function verified(err, user, info) {
      if (err) {
        return self.error(err);
      }
      if (!user) {
        return self.fail(info);
      }
      self.success(user, info);
    }

    function verifyResult(profile, verified) {
      try {
        if (self._passReqToCallback) {
          self._verify(req, profile, verified);
        } else {
          self._verify(profile, verified);
        }
      } catch (ex) {
        return self.error(ex);
      }
    }
  }
};
