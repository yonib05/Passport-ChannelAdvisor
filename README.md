# Passport-ChannelAdvisor

# In Development Do Not USE!!! (Yet..)



[Passport](http://passportjs.org/) strategy for authenticating with [Channel Advisor](https://channeladvisor.com/)
using the OAuth 2.0 API.

This module lets you authenticate using GitHub in your Node.js applications.
By plugging into Passport, Channel Advisor authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Install

    $ npm install passport-channeladvisor

## Usage

#### Configure Strategy

The Channel Advisor authentication strategy authenticates users using a ChannelAdvisor account
and OAuth 2.0 tokens.  The strategy requires a `verify` callback, which accepts
these credentials and calls `done` providing a user, as well as `options`
specifying a client ID, client secret, and callback URL.

    passport.use(new ChannelAdvisorStrategy({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: ['orders', 'inventory'],
        redirect_uri: "http://127.0.0.1:3000/auth/channeladvisor/callback"
      },
      function(accessToken, refreshToken, profile, done) {
        User.findOrCreate({ githubId: profile.id }, function (err, user) {
          return done(err, user);
        });
      }
    ));
    
    
    ## Profile Return format
    [  
       {  
          "$id":"1",
          "Type":"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
          "Value":"{%Name Of Company%}"
       },
       {  
          "$id":"2",
          "Type":"urn:ca:claim:scope",
          "Value":"inventory"
       },
       {  
          "$id":"3",
          "Type":"urn:ca:claim:scope",
          "Value":"orders"
       },
       {  
          "$id":"4",
          "Type":"urn:ca:claim:profile",
          "Value":"{%ID Value Int%}"
       }
    ]

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'channeladvisor'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

    app.get('/auth/channeladvisor',
      passport.authenticate('channeladvisor'));

    app.get('/auth/channeladvisor/callback', 
      passport.authenticate('channeladvisor', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
      });




## License

[The MIT License](http://opensource.org/licenses/MIT)

