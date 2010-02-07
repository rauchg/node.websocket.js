var Module = this.Module = function(data, connection){
};
var ps;


Module.prototype.onData = function(data, connection) {
	if (data == 'start'){
		connection.send("Gathering ps data");
    this.interval = setInterval(function(){
	  var sys = require('sys');
	  sys.exec("ps awux").addCallback(function (stdout, stderr) {
		ps = stdout;
	  }).wait();
      connection.send(ps);
    }, 5000);
  }
};

Module.prototype.onDisconnect = function(connection){
  clearInterval(this.interval);
};