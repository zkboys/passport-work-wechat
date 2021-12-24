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

    if (!verify) {
      throw new Error('WechatWorkStrategy requires a verify callback');
    }

    if (!options.corpId) {
      throw new Error('WechatWorkStrategy requires a corpId option');
    }
    if (!options.corpSecret) {
      throw new Error('WechatWorkStrategy requires a corpSecret option');
    }
    if (!options.agentId) {
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
    this._oauth = new OAuth2(options.corpId, options.corpSecret, options.agentId, _getAccessToken, _saveAccessToken);
    this._callbackURL = options.callbackURL;
    this._scope = options.scope;
    this._scopeSeparator = options.scopeSeparator || ' ';
    this._state = options.state;
    this._passReqToCallback = options.passReqToCallback;
    this._options = options;
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
    let callbackURL = options.callbackURL || this._callbackURL;

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
      const { code } = req.query;

      const accessToken = await self._oauth.getAccessToken();

      const profile = await self._oauth.getUserInfo(accessToken, code);

      profile.id = profile.UserId;
      if (profile.UserId) {
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

      const location = this._oauth.getAuthorizeUrl(params);
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
