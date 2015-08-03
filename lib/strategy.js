/**
 * Module dependencies.
 */
var util = require('util')
    , passport = require('passport-oauth2')
    , url = require('url')
    , OAuth2 = require('oauth').OAuth2 ;

function ChannelAdvisor(options, verify) {
  options = options || {};
  if (!options.client_id) { throw new TypeError('OAuth2Strategy requires a client_id option'); }
  if (!options.client_secret) { throw new TypeError('OAuth2Strategy requires a client_secret option'); }

  options.apiURL = options.apiURL || 'https://api.channeladvisor.com';
  options.authorizationPath = options.authorizationPath || '/oauth2/authorize';
  options.identityPath =  options.identityPath || '/oauth2/identity';
  options.identityURL =  options.apiURL + options.identityPath;
  options.authorizationURL = options.apiURL + options.authorizationPath;
  options.tokenPath = options.tokenPath || '/oauth2/token';
  options.tokenURL = options.apiURL + options.tokenPath;
  options.response_type = options.response_type || 'code';
  options.scope = options.scope || ['orders', 'inventory'];
  options.clientID = options.client_id;
  options.grant_type = options.grant_type || 'authorization_code'; //'refresh_token', 'soap'
  options.clientSecret = options.client_secret;
  options.access_type = options.access_type  || 'offline';
  options.callbackURL = options.redirect_uri || 'https://localhost:8443/callback';
  options.scopeSeparator = options.scopeSeparator || ' ';
  options.customHeaders = options.customHeaders || {};

  if (!options.customHeaders['User-Agent']) {
    options.customHeaders['User-Agent'] = options.userAgent || 'passport-channeladvisor';
  }

  passport.Strategy.call(this, options, verify);
  this._verify = verify;
  this.name = 'channeladvisor';
  this._oauth2 = new OAuth2(options.clientID,  options.clientSecret,
      options.apiURL, options.authorizationPath , options.tokenPath, options.customHeaders);
  this._oauth2.useAuthorizationHeaderforGET(true);
  this._identityURL = options.identityURL;
  this._refresh_token = options.refresh_token;
  this._approval_prompt = options.approval_prompt;
  this._access_type = options.access_type;
  this._passReqToCallback = options.passReqToCallback;
  this._skipUserProfile = (options.skipUserProfile === undefined) ? false : options.skipUserProfile;


}



util.inherits(ChannelAdvisor, passport.Strategy);

ChannelAdvisor.prototype.authenticate = function(req, options) {
  options = options || {};
  var self = this;
  var getToken = function(code, params) {
    params = params || {};
    self._oauth2.getOAuthAccessToken(code, params,
        function(err, accessToken, refreshToken, returnParams) {
          if (err) {
            return self.error(self._createOAuthError('Failed to obtain access token', err));
          }
          self._loadIdentities(accessToken, function (err, identity) {
            if (err) {
              return self.error(err);
            }

            function verified(err, user, info) {
              if (err) { return self.error(err); }
              if (!user) {
                return self.fail(info);
              }
              self.success(user, info);
            }

            try {
              if (self._passReqToCallback) {
                var arity = self._verify.length;
                if (arity == 6) {
                  self._verify(req, accessToken, refreshToken, returnParams, identity, verified);
                } else { // arity == 5
                  self._verify(req, accessToken, refreshToken, identity, verified);
                }
              } else {
                var arity = self._verify.length;
                if (arity == 5) {
                  self._verify(accessToken, refreshToken, returnParams, identity, verified);
                } else { // arity == 4
                  self._verify(accessToken, refreshToken, identity, verified);
                }
              }
            } catch (ex) {
              return self.error(ex);
            }
          });
        });
  };

  if (req.query && req.query.error) {
    if (req.query.error == 'access_denied') {
      return this.fail({ message: req.query.error_description });
    } else {
      return this.error(new AuthorizationError(req.query.error_description, req.query.error, req.query.error_uri));
    }
  }

  var callbackURL = options.callbackURL || this._callbackURL;
  if (callbackURL) {
    var parsed = url.parse(callbackURL);
    if (!parsed.protocol) {
      // The callback URL is relative, resolve a fully qualified URL from the
      // URL of the originating request.
      callbackURL = url.resolve(utils.originalURL(req, { proxy: this._trustProxy }), callbackURL);
    }
  }

  var code;

  if (req.query && req.query.code) {
    code = req.query.code;

    if (this._state) {
      if (!req.session) { return this.error(new Error('OAuth2Strategy requires session support when using state. Did you forget app.use(express.session(...))?')); }

      var key = this._key;
      if (!req.session[key]) {
        return this.fail({ message: 'Unable to verify authorization request state.' }, 403);
      }
      var state = req.session[key].state;
      if (!state) {
        return this.fail({ message: 'Unable to verify authorization request state.' }, 403);
      }

      delete req.session[key].state;
      if (Object.keys(req.session[key]).length === 0) {
        delete req.session[key];
      }

      if (state !== req.query.state) {
        return this.fail({ message: 'Invalid authorization request state.' }, 403);
      }
    }
    options.grant_type = 'authorization_code';
    options.redirect_uri = callbackURL;
    var params = this.tokenParams(options);
    getToken(code, params);

  } else if(this._refresh_token) {
    var params = this.refreshParams(options);
    getToken(this._refresh_token, params);


  }
  else{
    options.redirect_uri = callbackURL;
    options.response_type = 'code';
    var params = this.authorizationParams(options);

    var scope = options.scope || this._scope;
    if (scope) {
      if (Array.isArray(scope)) { scope = scope.join(this._scopeSeparator); }
      params.scope = scope;
    }
    var state = options.state;
    if (state) {
      params.state = state;
    } else if (this._state) {
      if (!req.session) { return this.error(new Error('OAuth2Strategy requires session support when using state. Did you forget app.use(express.session(...))?')); }

      var key = this._key;
      state = uid(24);
      if (!req.session[key]) { req.session[key] = {}; }
      req.session[key].state = state;
      params.state = state;
    }

    var location = this._oauth2.getAuthorizeUrl(params);
    this.redirect(location);
  }

};






/**
 * Return extra parameters to be included in the authorization request.
 *
 * Some OAuth 2.0 providers allow additional, non-standard parameters to be
 * included when requesting authorization.  Since these parameters are not
 * standardized by the OAuth 2.0 specification, OAuth 2.0-based authentication
 * strategies can overrride this function in order to populate these parameters
 * as required by the provider.
 *
 * @param {Object} options
 * @return {Object}
 * @api protected
 */
ChannelAdvisor.prototype.authorizationParams = function(options) {
  options = options || {};
  options.approval_prompt = this._approval_prompt;
  options.access_type = this._access_type;
  return options;
};


ChannelAdvisor.prototype.refreshParams = function(options) {
  options = options || {};
  options.grant_type = 'refresh_token';
  options.access_type = this._access_type;
  return options;
};



ChannelAdvisor.prototype.tokenParams = function(options) {
  return options || {};
};

/**
 * Retrieve user profile from service provider.
 *
 * OAuth 2.0-based authentication strategies can overrride this function in
 * order to load the user's profile from the service provider.  This assists
 * applications (and users of those applications) in the initial registration
 * process by automatically submitting required information.
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api protected
 */
ChannelAdvisor.prototype.userProfile = function(accessToken, done) {
  this._oauth2.getProtectedResource(this._identityURL, accessToken , function(err, data, resp){
    done(err, data);
  });
};



/**
 * Load user profile, contingent upon options.
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api private
 */
ChannelAdvisor.prototype._loadIdentities = function(accessToken, done) {
  var self = this;

  function loadIt() {
    return self.userProfile(accessToken, done);
  }
  function skipIt() {
    return done(null);
  }

  if (typeof this._skipUserProfile == 'function' && this._skipUserProfile.length > 1) {
    // async
    this._skipUserProfile(accessToken, function(err, skip) {
      if (err) { return done(err); }
      if (!skip) { return loadIt(); }
      return skipIt();
    });
  } else {
    var skip = (typeof this._skipUserProfile == 'function') ? this._skipUserProfile() : this._skipUserProfile;
    if (!skip) { return loadIt(); }
    return skipIt();
  }
};




/**
 * Expose `Strategy`.
 */
module.exports = ChannelAdvisor;
