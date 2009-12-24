var Module = this.Module = function(){
};

Module.prototype.onData = function(data, connection){
  if (data == 'start'){
    this.interval = setInterval(function(){
      connection.send(JSON.stringify({time: new Date().toString()}));
    }, 1000);
  }  
};

Module.prototype.onDisconnect = function(connection){
  clearInterval(this.interval);
};