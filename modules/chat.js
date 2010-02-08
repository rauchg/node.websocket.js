var Module = this.Module = function(){
  this.server         = null;


  this.addConnection = function(connection) {
    this.server.chatConnections.push(connection);
    connection.id = this.server.nextIdToAssign++;
  };
  // Broadcast a message to all clients. The advantage of having this
  // is that we can keep track of all message that have come through and
  // replay the last N messages when new clients log on.
  this.broadcast = function(fn) {
    this.server.chatConnections.forEach(function(connection) {
     var data = fn(connection);
     connection.send(JSON.stringify(data));
    })    
    this.server.chatHistory.push(fn({}));
  };

  this.lastNMessages = function(N) {
    if (this.server.chatHistory.length < N) {
      N = this.server.chatHistory.length;
    }
 
    var lastNMessages = []
    for (var idx = this.server.chatHistory.length - N; idx < this.server.chatHistory.length; ++idx) {
      lastNMessages.push(this.server.chatHistory[idx]);
      
    }
    
    return lastNMessages;
  }
 
  this.removeConnection = function(connection) {
	  for (var i = 0; i < this.server.chatConnections.length; i++) {
      if (this.server.chatConnections[i].id == connection.id) {
        this.server.chatConnections.splice(i,1)
        break;
      }
    }

    this.broadcast(function(conn) {
	    var timestamp = new Date();
      return { 'nick': connection.nick, 
               'type': 'PART', 
               'timestamp': timestamp.toString() };
    });
  };
 
  this.say = function(connection, message) {
    this.broadcast(function(conn) {
	  var timestamp = new Date();
      return {
        'type': "MSG",
        'isSelf': (conn.id == connection.id),
        'text': message,
        'timestamp': timestamp.toString(),
        'nick': connection.nick
      };
    });
  };
};

Module.prototype.onData = function(data, connection){
  // setup server
  this.server = connection.server;
  // is this the first connection?
  if (typeof(this.server.chatConnections) == "undefined") {
    this.server.chatConnections    = [];
    this.server.chatHistory        = [];
    this.server.nextIdToAssign = 0;
  }
  
  // handle the data
  if (data.match(/^NICK /)) {
  	connection.nick = data.substr(5);
  	this.broadcast(function(conn) {
		  var timestamp = new Date();
      return { 'nick': connection.nick, 
               'type': 'JOIN', 
               'timestamp': timestamp.toString() };
	    });
	    
	  // send last 10 messages to client
  	var historySize = 10;	
  	var history = this.lastNMessages(historySize);
  	for (var i=0; i< history.length; i++) {
  	  connection.send(JSON.stringify(history[i]));
  	}
  	this.addConnection(connection);
  	connection.send(JSON.stringify({'type': "RPL_WELCOME"}));
	
    }
  if (data.match(/^MSG /)) {
  	message = data.substr(4);
  	this.say(connection, message);
  }
  if (data.match(/^USERS/)) {
  	var users = new Array;
  	for(var i=0; i< this.server.chatConnections.length; i++) {
  		users.push(this.server.chatConnections[i]['nick']);
  	}
  	connection.send(JSON.stringify({'type': "RPL_USERS", 'nicks': users}));
  }
	
};

Module.prototype.onDisconnect = function(connection){
	this.removeConnection(connection);
};