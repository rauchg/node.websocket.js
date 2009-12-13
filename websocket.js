/*
---
name: server.js

description: Main server initialization

author: [Guillermo Rauch](http://devthought.com)
...
*/

var tcp = require('tcp'),
    sys = require('sys'),
    tools = require('./tools'),
    logger = require('./log'),
    
    // what the request headers should match
    requestHeaders = [
      /^GET (\/[^\s]*) HTTP\/1\.1$/,
      /^Upgrade: WebSocket$/,
      /^Connection: Upgrade$/,
      /^Host: (.+)$/,
      /^Origin: (.+)$/
    ],
    
    dataMatch = /^\u0000(.+)\ufffd$/,
    
    // what the response headers should be
    responseHeaders = [
      'HTTP/1.1 101 Web Socket Protocol Handshake', 
      'Upgrade: WebSocket', 
      'Connection: Upgrade',
      'WebSocket-Origin: {origin}',
      'WebSocket-Location: ws://{host}{resource}',
      '',
      ''
    ],
    
    log = function(message, type){      
      logger.store('['+ new Date() +'] ['+ (type || 'error') +'] ' + message);
    },
    
    empty = new Function,
    
    Connection,
    
Server = this.Server = function(options){
  this.options = tools.merge({
    port: 8080,
    host: 'localhost',
    origins: '*',
    log: true,
    logKey: null
  }, options || {});
  
  if (this.options.logKey === null) logger.setKey('node.websocket.' + this.options.host + '.' + this.options.port);
  
  var self = this;
  this.clients = 0;
  this.server = tcp.createServer(function(socket){
    new Connection(self, socket);    
  });
  this.server.listen(this.options.port, this.options.host);
  
  if (this.options.log) setInterval(function(){
    log(self.clients + ' clients connected', 'info');
  }, 5000);
};

Server.prototype._verifyOrigin = function(origin){
  if (this.options.origins === '*' || this.options.origins === origin) return true;
  if (!tools.isArray(this.options.origins)){
    log('No valid `origins` array passed to constructor. This server wont accept any connections.', 'info');
    return false;
  }
  for (var i = 0, l = this.options.origins.length; i < l; i++){
    if (this.options.origins[i] === origin) return true;
  }
  return false;
};

Server.prototype._onConnect = function(){
  this.clients++;  
};

Server.prototype._onDisconnect = function(){
  this.clients--;
};

this.Connection = Connection = function(server, socket){
  this.server = server;
  this.socket = socket;
  this.handshaked = false;
  
  this.log = server.options.log ? function(message, type){
    log('[client '+ socket.remoteAddress +'] ' + message, type);
  } : empty;
  this.log('Server created', 'info');
  
  var self = this;
  socket.setTimeout(0);
  socket.setNoDelay(true); // disabling Nagle's algorithm is encouraged for real time transmissions
  socket.setEncoding('utf8'); // per spec
  socket.addListener('connect', function(){ self.onConnect(); });
  socket.addListener('receive', function(data){ self._onReceive(data); });
  socket.addListener('eof', function(){ self._onDisconnect(); });
};

Connection.prototype.onConnect = function(data){   
  this.server._onConnect(this);
};

Connection.prototype._onReceive = function(data){
  if (this.handshaked){   
    this._handle(data);    
  } else {
    this._handshake(data)    
  }  
};

Connection.prototype._onDisconnect = function(){
  if (this.module && this.module.onDisconnect) this.module.onDisconnect(this);
  this.socket.close();
  this.server._onDisconnect(this);
};

Connection.prototype.send = function(data){
  try {
    this.socket.send('\u0000' + data + '\uffff');
  } catch(e) {
    this.socket.close();
  }  
};

Connection.prototype._handle = function(data){
  // utf8 data is in between of a 0x00 byte and a 0xFF byte per spec
  var match = data.match(dataMatch);

  if (!match){
    this.log('Data incorrectly framed by UA. Dropping connection');
    this.socket.close();
    return false;
  }
  
  var chunks = data.replace(/^(\u0000)|(\ufffd)$/g, '').split('\ufffd\u0000');
  for (var i = 0, l = chunks.length; i < l; ++i) { 
    this.module.onData(chunks[i], this);
  }
  
  return true;
};

Connection.prototype._handshake = function(data){
  this.log('Performing handshake', 'info');
  
  var self = this, 
      matches = [], 
      module, 
      headers = data.split('\r\n');
  
  for (var i = 0, l = headers.length, match; i < l; i++){
    if (i === requestHeaders.length) break; // handle empty lines that UA send 
    match = headers[i].match(requestHeaders[i]);
    if (match && match.length > 1){
      // if there's a capture group, push it into the matches          
      matches.push(match[1]);
    } else if (!match) {
      this.log('Handshake aborted. Bad header ' + headers[i]);          
      this.socket.close()
      return false;
    }
  }
  
  if (!this.server._verifyOrigin(matches[2])){
    this.log('Handshake aborted. Security policy disallows Origin: ' + matches[2]);
    this.socket.close();
  }
  
  module = './modules' + (matches[0] == '/' ? '/_default' : matches[0]).toLowerCase();
  try {
    this.module = require(module);
  } catch(e){
    this.log('Handshake aborted. Could not stat module file ' + module + '.js' + ' for resource ' + matches[0]);
    this.socket.close();
    return false;
  }
  
  if (!this.module.onData){
    this.log('Module ' + module + '.js doesn\'t implement an onData method.');
    this.socket.close();
    return false;
  }
  
  this.socket.send(tools.substitute(responseHeaders.join('\r\n'), {
    resource: matches[0],
    host: matches[1],
    origin: matches[2]
  }));
  
  this.handshaked = true;
  this.log('Handshake sent', 'info');
  return true;
};