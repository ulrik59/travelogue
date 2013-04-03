<a href="https://github.com/spumko"><img src="https://raw.github.com/spumko/spumko/master/images/from.png" align="right" /></a>
![travelogue Logo](https://raw.github.com/spumko/travelogue/master/images/travelogue.png)

[Passport.js](http://passportjs.org/) integration for [**hapi**](https://github.com/spumko/hapi)

**Note**: Docs are out of date for v0.2.0.

[![Build Status](https://secure.travis-ci.org/spumko/travelogue.png)](http://travis-ci.org/spumko/travelogue)

Travelogue is a [Hapi plugin](https://github.com/spumko/hapi/blob/master/docs/Reference.md#server-plugins) that provides modular and unobtrusive authentication to Hapi through Passport. Travelogue supports almost every Passport strategy including Facebook OAuth, Google OpenID, and many others listed [here](https://github.com/jaredhanson/passport#strategies-1).


## Install

    $ npm install travelogue yar passport



## Usage

Travelogue has been designed to integrate consistently with Passport APIs - allowing developers who have used Passport before to use Travelogue with very few modifications.  Thus, most Travelogue apps will follow the same general format outlined below:

```javascript
var config = {
    port: 8000,
    "yar": {
        "cookieOptions": {
            "password": "worldofwalmart"
        },
        "session": true
    },
    "passport": {
        "urls": {
            "failureRedirect": "/login"
        }
    }
    /* Strategy config could go here
    "facebook": {
        "clientID": "...",
        "clientSecret": "...",
        "callbackURL": "..."
    }
    */
};

var server = new Hapi.Server('localhost', config.port);
Travelogue.configure(server, Passport, config); // Modifies both server and Passport

// Follow normal Passport rules to add Strategies
Passport.use(/* Strategy Goes Here */);
Passport.serializeUser(ser);
Passport.deserializeUser(deser);

// Add your routes
server.route(routeOne);
// ... 

server.start(function () {

    console.log('server started on port: ', server.settings.port);
});
```

**Note:** Be careful with setting strategy `callbackURL`'s. If you are testing using `localhost:{port}`, make sure this matches the callbackURL exactly AND the designated callback URL in your third-party application settings.


#### Known Broken/Unsupported Strategies

None so far. Will be listed here if they occur.


### Route Handling

There are three common categories of third-party authentication route handling:

* External Authentication
* Internal Authentication
* Authorization

External Authentication allows the user to authenticate themselves via a third-party service like Facebook or Twitter.

Internal Authentication returns the credentials from External Authentication for verification on the server and ultimately "logs" the user on (saves their session for subsequent visits).

Authorization checks whether or not the user logged-on is allowed to access a specific route or resource.


#### External Authentication

For most third-party authentication schemes/strategies, External Authentication is done via a single route using the `Passport.authentication(__strategy__)` handler.

This handler typically will redirect the user to the third-party website, authenticate the user, and redirect to the `callbackURL` configured for that specific strategy (the Internal Authentication step).

```javascript
server.addRoute({
    method: 'GET',
    path: '/auth/facebook',
    config: {
        // can use either passport.X or Travelogue.passport.X
        handler: Passport.authenticate('facebook')
    }
});
```

#### Internal Authentication

For all authentication schemes and strategies, the External Authentication information must be sent back to the server. Thus, one route handler must be specifically catered to the task of retrieving this information and processing it appropriately (using the `Passport.authenticate(strategy, options)(request, handler)` format).

```javascript
server.addRoute({
    method: 'GET',
    path: '/auth/facebook/callback',
    config: {
        handler: function (request) {
            
            Travelogue.passport.authenticate('facebook', { failureRedirect: '/'})(request, function () {

                request.reply.redirect(config.passport.urls.successRedirect || '/').send();
            });
        }
    }
});
```

#### Authorization

After verifying the identity of a user, the server will need to determine the permissions a user has for specific routes and resources.

In the typical case, once verified and logged-in, the user has full access to a new set of routes. Travelogue provides a shortcut to verify that a user is logged-on via the `Travelogue.ensureAuthenticated(handler)` interface.

```javascript
server.addRoute({
    method: 'GET',
    path: '/home',
    config: {
        handler: Travelogue.ensureAuthenticated(function (request) {

            // If logged in already, redirect to /home
            // else to /login
            request.reply("ACCESS GRANTED");
        });
    }
});
```

However, it may be the case that there may be several levels of user access permissions. Just like with Passport, a custom function can be created similar to `ensureAuthenticated`. A helper function may be added in the future to make this easier.



## API Reference

While, Travelogue only requires the use of a few functions to configure and set up Passport authentication, it may be important to customize Travelogue's behavior outside the defaults. Therefore, Travelogue exposes several low-level methods. This section contains documentation for all methods and variables (__**but may be incomplete for the time being**__).

### Travelogue-level

**Travelogue.configure(server, passport, settings)**

Configures a Hapi `server` to support Travelogue.

- `server` - an instance of Hapi.Server to use with Travelogue
- `passport` - the passport module
- `settings` - the options object passed to Travelogue
    - `yar` - the options object passed to yar
        - `cookieOptions`
            - `password` - (Required) secret key used to hash cookie
            - `session` - used to enable session support

Returns null.

**Travelogue.passport**

Returns an alternative reference to the passport module.

**Travelogue.ensureAuthenticated(handler)**

Provides a commonly used handler wrapper for executing `handler` if the request is authenticated. It will redirect to `settings.passport.urls.failureRedirect` if the request is not authenticated.

Note: This does not check to make sure the user is authorized to access a given endpoint or URL.

**Travelogue.middleware**

Provides direct access to the passport middlewares specifically created for Hapi.

Returns an object with the following interface:

- `authenticate` - authentication related functions
- `initialize` - initialization related functions

### Request-level

**Request.isAuthenticated()**

Returns true if the request is authenticated; false, otherwise.

**Request.logIn(user, options, next)**

Provides a direct interface to setting or modifying the user session data.

- `user` - (Required) an object that contains user session data
- `options` - the options object (currently unused)
- `next` - (Required) callback function to execute on completion or failure

Returns null. 

**Request.logOut()**

Permanently deletes the user session data ( thus unauthenticating the user and clearing out cookies).

Returns null.
