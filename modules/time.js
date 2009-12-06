var interval;

this.onData = function(data, connection){
  if (data == 'start'){
    interval = setInterval(function(){
      connection.send(JSON.stringify({time: new Date().toString()}));
    }, 1000);
  }  
};

this.onDisconnect = function(connection){
  clearInterval(interval);
};