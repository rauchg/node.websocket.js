var Module = this.Module = function(data, connection){
  // do something 
  // connection is the instance of websocket::Connection
};

Module.prototype.onData = function(data, connection) {
	connection.send(data);
};