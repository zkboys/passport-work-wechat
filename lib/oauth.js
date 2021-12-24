const querystring = require('querystring');
const request = require('request');
const AccessToken = require('./access_token.js');

const AuthorizeUrl = 'https://open.work.weixin.qq.com/wwopen/sso/qrConnect';
const AccessTokenUrl = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
const UserInfoUrl = 'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo';

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

    getAuthorizeUrl(options) {
        const params = {
            appid: this._corpId,
            agentid: options.agentId,
            redirect_uri: options.redirect_uri,
            response_type: 'code',
            href: options.href,
            scope: options.scope || 'snsapi_login',
            state: options.state || 'state',
        };
        return AuthorizeUrl + '?' + querystring.stringify(params);
    }

    async getOAuthAccessToken() {
        const params = {
            corpid: this._corpId,
            corpsecret: this._corpSecret,
        };
        const url = AccessTokenUrl + '?' + querystring.stringify(params);
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
        const url = UserInfoUrl + '?' + querystring.stringify(params);
        return await wechatRequest(url);
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
