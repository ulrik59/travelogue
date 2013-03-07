module.exports = {};
module.exports.FollowRedirect = function (server, maxRedirects) {

    maxRedirects = maxRedirects || 3;
    var count = 0;
    
    return function (callback) {

        var RedirectMe = function (res) {

            var header = res.headers['Set-Cookie'];
            var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);
            
            if ([302, '302'].indexOf(res.statusCode) >= 0) {
                if (count > maxRedirects) {
                    throw "Maximum HTTP redirects reached";
                }
                
                var redirect = {
                    method: 'GET',
                    url: res.headers['Location'],
                    headers: {
                        cookie: cookie[1]
                    }
                };
                ++count;
                server.inject(redirect, RedirectMe);
            }
            else {
                return callback(res, cookie[1]);
            }
        };
        
        return RedirectMe;
    };
};