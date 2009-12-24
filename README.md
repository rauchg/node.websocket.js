node.websocket.js
=================

node.websocket.js is an experimental implementation of the [Web Socket protocol](http://tools.ietf.org/pdf/draft-hixie-thewebsocketprotocol-60.pdf) for the Evented I/O API [Node.js](http://nodejs.org/).

The end goal of the project is to provide an abstraction layer of the protocol used to support different communication schemes through a simple-to-use API. As such, node.websocket.js should be able to work with UAs that use alternative connection methods (xhr streaming, long-polling, forever iframe).

Requirements
------------


* [Node.js](http://nodejs.org/) (tested with v0.1.21)

Optional:

* [Redis](http://code.google.com/p/redis/) used for logging. [redis-node-client](http://github.com/fictorial/redis-node-client) is included. See `log.js` for the benefits of Redis as a logging mechanism.

How to use
----------

Run the server:

	$ node runserver.js

By default, it'll listen on localhost port 8080. node.websocket.js interprets the arguments passed in and turns those into the object passed to the `websocket::Server` constructor:

	$ node runserver.js --port='8080' --host='some_other_host' --origins=['http://some_allowed_host']
  
The option values are eval()'d to turn them into native JavaScript types, so don't forget to wrap strings in `' '`.

On the client side, initialize a `WebSocket` like this:

	new WebSocket(ws://localhost:8080/test);

`websocket::Connection` will try to load a [module](http://nodejs.org/api.html#_modules) in the modules/ directory with the name of the passed resource (in this case `test`).

If the resource is just / (for example `ws://localhost:8080/`), modules/_default.js will be loaded. The module has to expose a `Module` pseudoclass with an onData method like this:

	var Module = this.Module = function(){
		// constructor;
	};
	
	Module.prototype.onData = function(data, instance){
		// do something 
	};
  
The second parameter received is the `websocket::Connection` instance. To send data back to the client your module should do something like this:

	Module.prototype.onData = function(data, connection){
		connection.send('sending data!');
	}
	
Additionally, you can implement an `onDisconnect` method, called when a `Connection` finishes.
	
Features
--------

* Very clean API that you can extend.

* It's easy to handle different resources as modules through Node dependency injection.

* Support for flash policy requests (for flash-based WebSocket emulation for old browsers). Thanks @[joewalnes](http://github.com/joewalnes/)!
  
Demonstration
-------------

[Here's a screenshot](http://cld.ly/faog2) of the demo that comes with node.websocket.js: 

In order to run it by yourself, download and compile [redis](http://code.google.com/p/redis/) and run it in a terminal

	$ ./redis-server
  
While redis is simply used for logs storage here (and its not indispensable), I highly encourage you to discover and examine its potential.

In a different terminal, as described above, run node.webserver.js:

	$ node runserver.js
  
Access test/test.html (which you can run locally or deliver through any web server, such as Apache) and watch true realtime data exchange!

TODO
----

* Support for `WebSocket-Protocol` header, and additional HTTP headers such as `Cookie`. WebSocket-Protocol support is optional, so node.websocket is still spec-compliant.
* Support for wss:// and TLS handshake
* More strict URI parsing/validation

Author
------

Guillermo Rauch <[http://devthought.com](http://devthought.com)>