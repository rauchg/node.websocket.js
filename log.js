/*
---
name: log.js

description: <
  Very simple logging based on [redis](http://code.google.com/p/redis/) so that:
   * We don't have to implement a piped logging mechanism / log rotation (no file size concerns)
   * We can perform common operations like accessing the tail or a RANGE of the logs efficiently 
  
todo:
 - Support for multiple loggers, and not a single global one. (Logger as a protypical class)

author: [Guillermo Rauch](http://devthought.com)
...
*/

var sys = require('sys'),
    redis = require('./lib/redis'),
    ready = null,
    busy = false,
    client = new redis.Client(),
    stack = [],
    key = 'logs',
  
/*
 * Called when the redis client is connected. Pushes stack messages
 *
 */    
onConnect = function(){
  sys.puts('[log.js] Connected to redis');
  ready = true;
  processStack();
},

/* 
 * Logging method. If server is not ready or a message hasn't been delivered yet, stack the logs.
 *
 */
log = function(message){
  sys.puts(message);
  stack.push(message);
  if (ready && !busy) processStack();
},

/*
 * Does the logging processing in a non-blocking but ordered way.
 *
 */
processStack = function(){
  if (stack.length){
    client.rpush(key, stack.shift()).addCallback(processStack);
  } else {
    busy = false;
  }  
};
  
this.setKey = function(name){
  key = name;
};

this.store = function(message, type){
  log(message);
};

// connect to redis
client.connect(onConnect, function(){
  ready = false;
});