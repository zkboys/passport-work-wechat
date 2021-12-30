const querystring = require('querystring');
const request = require('request');
const AccessToken = require('./access_token.js');

// 扫码登录
const QR_AUTHORIZE_URL = 'https://open.work.weixin.qq.com/wwopen/sso/qrConnect';
// 网页授权
const AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';
// 获取access token
const ACCESS_TOKEN_URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
// 获取用户id
const USER_ID_URL = 'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo';
// 获取用户完整信息
const USER_INFO_URL = 'https://qyapi.weixin.qq.com/cgi-bin/user/get';

module.exports = class OAuth {
  constructor(corpId, corpSecret, agentId, getAccessToken, saveAccessToken) {
    if (!corpId || !corpSecret || !agentId) {
      throw new Error('Wechat Work OAuth requires \'corpId\', \'corpSecret\' and  \'agentId\'');
    }
    if (!getAccessToken || !saveAccessToken) {
      throw new Error('Wechat Work OAuth requires \'getAccessToken\' and \'saveAccessToken\'');
    }

    if (!(this instanceof OAuth)) {
      return new OAuth(corpId, corpSecret, agentId, getAccessToken, saveAccessToken);
    }
    this._corpId = corpId;
    this._corpSecret = corpSecret;
    this._agentId = agentId;
    this._getAccessToken = getAccessToken;
    this._saveAccessToken = saveAccessToken;
  }

  getQRAuthorizeUrl(options) {
    const params = {
      appid: this._corpId,
      agentid: this._agentId,
      redirect_uri: options.redirect_uri,
      response_type: 'code',
      href: options.href,
      scope: options.scope || 'snsapi_login',
      state: options.state || 'state',
    };
    return QR_AUTHORIZE_URL + '?' + querystring.stringify(params);
  }

  getAuthorizeUrl(options) {
    const params = {
      appid: this._corpId,
      redirect_uri: options.redirect_uri,
      response_type: 'code',
      scope: options.scope || 'snsapi_base',
      state: options.state || 'state',
    };

    return AUTHORIZE_URL + '?' + querystring.stringify(params);
  }

  async getOAuthAccessToken() {
    const params = {
      corpid: this._corpId,
      corpsecret: this._corpSecret,
    };
    const url = ACCESS_TOKEN_URL + '?' + querystring.stringify(params);
    const result = await wechatRequest(url);

    const accessToken = new AccessToken(result.access_token, result.expires_in, Date.now());
    await this._saveAccessToken(accessToken);
    return accessToken;
  }

  async getAccessToken() {
    try {
      const accessToken = await this._getAccessToken();

      if (accessToken.isExpired()) {
        return await this.getOAuthAccessToken();
      }
      return accessToken;

    } catch (e) {
      return await this.getOAuthAccessToken();
    }
  }

  async getUserInfo(accessToken, code) {
    const params = {
      access_token: accessToken.access_token,
      code,
    };
    const url = USER_ID_URL + '?' + querystring.stringify(params);
    const idInfo = await wechatRequest(url);
    const { UserId: userid } = idInfo;

    const infoUrl = USER_INFO_URL + '?' + querystring.stringify({ access_token: params.access_token, userid });

    return await wechatRequest(infoUrl);
  }
};

async function wechatRequest(url) {
  return new Promise((resolve, reject) => {
    request(url, function(err, _res, body) {
      if (err) return reject(err);

      let result = null;
      try {
        result = JSON.parse(body);
      } catch (e) {
        return reject(e);
      }
      if (result.errcode) return reject(result);
      resolve(result);
    });
  });
}
