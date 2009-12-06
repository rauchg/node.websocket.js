var tools = require('./tools'),
    websocket = require('./websocket');

new websocket.Server(tools.argvToObject(process.ARGV));