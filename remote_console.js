/**************
* LICENSE: BSD 
* AUTHOR: Alex Kessinger http://alexkessinger.net @voidfiles
* 
* One File Remote Console.log for node.js
* 
* This should be fairly simple to run, you just need to include 
* the provided debug js in your webpage before you want to use it.
* 
* REQUIREMENTS: node.js 
* 
* once you have node.js installed you can run
* this script from the command line like so
* 
* >>> node remove_console.js
* Server running at http://127.0.0.1:8124/
* 
* Then you can in your app include the following JS file
* 
* http://127.0.0.1:8124/debug.js 
* 
* And then you will be able to call log()
* and see the output in your console
* 
* There is also helper function called catchRemote.
* It accepts a function, which it will immediatly execute.
* If it catches an error it log it remotely.
* 
* >>> catchRemote(function(){ throw("WTF");});
* [ { error: 'WTF' } ]
* 
* If you want you can change the host, and port 
* by passing them as arguments
* 
* 
* >>> node remove_console.js 192.168.1.101 8001
* Server running at http://92.168.1.101:8001/
* 
*/

var http = require('http'),
    url = require('url'),
    sys = require('sys'),
    host = (process.argv[2]) ? process.argv[2] : "localhost",
    port = (process.argv[3]) ? process.argv[3] : 8124;
    rHost = (process.argv[4]) ? process.argv[4] : host;

var winston = require('winston');

var logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            colorize: true
        })
    ]
});

function parseJson(string){
    try{
        return JSON.parse(string);
    } catch(e){
        return false;
    }
}

if (host == 'null') {
    host = undefined;
}

function returnDebugJS(ns){
    ns = "console";
    return [
          '(function(console){'
        , '  "use strict";'
        , '   var log = function() {'
        , '     '+ ns + '.oldlog(arguments);'
        , '     var str = "",'
        , '     args = arguments;'
        , '     var jse = function () {'
        , '       var seen = [];'
        , '       return function(key, val) {'
        , '         if (typeof val === "object") {'
        , '           if (seen.indexOf(val) >= 0) {'
        , '             return "cycle";'
        , '           }'
        , '           seen.push(val);'
        , '         }'
        , '         return val;'
        , '       };'
        , '    };'
        , '    for (var i = 0; i < args.length; i++) {'
        , '      try {'
        , '        str += " | " + Ext.encode(args[i]);'
        , '      } catch (e) {'
        , '        str += " | [cycled]"'
        , '      }'
        , '    }'
        , '    var img = document.createElement("img");'
        , '    var url = "http://' + rHost + ':' + port + '/?count=" + Date.now() + "&console=" + encodeURIComponent(str);'
        , '    img.src = url;'
        , '  };'
        , '  '
        , ' ' + ns + '.oldlog = ' + ns + '.log;'
        , ' ' + ns + '.log = log;'
        , '})(window.console);'
    ].join('\n');
}

var queue = {};
var logged = 0;

http.createServer(function (req, res) {
    var request = url.parse(req.url, true);
    var msg =  request.query.console;
    if (msg) {
        try {
            msg = decodeURIComponent(msg);
        } catch(e) {
            /* handle error */
        }

        var meta = {
            client: req.headers
        };

        if (/(error|exception)/.test(msg)) {
            logger.error(msg, meta);
        } else {
            logger.info(msg, meta);
        }

        res.writeHead(200, {'Content-Type': 'image/jpeg'});
        res.end("");
    } else if (req.url.indexOf("/debug.js") === 0){
        var ns = request.query && request.query.ns || "";
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        res.end(returnDebugJS(ns));
    } else if (req.url == "/favicon.ico"){
        res.writeHead(200, {'Content-Type': 'image/gif'});
        res.end("");
    }
}).listen(port, host);
logger.info('Server running at http://'+rHost+':'+port+'/');
