// Set URL of your WebSocketMain.swf here:
WebSocket.__swfLocation = "flash/WebSocketMain.swf";

// Set globals
var CONFIG = { debug: false
             , nick: "#"   // set in onConnect
             , last_message_time: 1
             };
 
var nicks = [];

// Chat message actions

function updateUsersLink ( ) {
  var t = "Currently hosting " + nicks.length.toString() + " user";
  if (nicks.length != 1) t += "s";
  $("#usersLink").text(t);
}

function userJoin(nick, timestamp) {
  addMessage(nick, "joined the chat", timestamp, "join");
  for (var i = 0; i < nicks.length; i++)
    if (nicks[i] == nick) return;
  nicks.push(nick);
  updateUsersLink();
}

function userPart(nick, timestamp) {
  addMessage(nick, "left the chat", timestamp, "part");
  for (var i = 0; i < nicks.length; i++) {
    if (nicks[i] == nick) {
      nicks.splice(i,1)
      break;
    }
  }
  updateUsersLink();
}



// Screen states

function showConnect () {
  $("#connect").show();
  $("#loading").hide();
  $("#chatroom").hide();
  $("#nick").focus();
}
 
function showLoad () {
  $("#connect").hide();
  $("#loading").show();
  $("#chatroom").hide();
}
 
function showChat (nick) {
  $("#toolbar .nick").text("[" + CONFIG.nick + "]");
  $("#chatroom").show();
  $("#entry").focus();
 
  $("#connect").hide();
  $("#loading").hide();
 
  scrollDown();
}

// Utility functions
util = {
  urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g, 
 
  //  html sanitizer 
  toStaticHTML: function(inputHtml) {
    return inputHtml.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
  }, 
 
  zeroPad: function (digits, n) {
    n = n.toString();
    while (n.length < digits) 
      n = '0' + n;
    return n;
  },
 
  timeString: function (date) {
    var minutes = date.getMinutes().toString();
    var hours = date.getHours().toString();
    return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
  },
 
  isBlank: function(text) {
    var blank = /^\s*$/;
    return (text.match(blank) !== null);
  }
};

function scrollDown () {
  window.scrollBy(0, 100000000000000000);
  $("#entry").focus();
}

function outputUsers () {
  var nick_string = nicks.length > 0 ? nicks.join(", ") : "(none)";
  addMessage("users:", nick_string, new Date(), "notice");
  return false;
}

function addMessage (from, text, time, _class) {
	if (text === null) {
		return;
	}
		
	if (time == null) {
		// if the time is null or undefined, use the current time
		time = new Date();
	} else if ((time instanceof Date) === false) {
		// if it is a timestamp, interpret it
		time = new Date(time); 
	}
	
	var messageElement = $(document.createElement("tr"));
	
	messageElement.addClass("message");
	if (_class) {
		messageElement.addClass(_class);
	}
	
	// sanitize
	text = util.toStaticHTML(text);
	
	// see if it matches our nick?
	var nick_re = new RegExp(CONFIG.nick);
	if (nick_re.exec(text)) {
		// if so, highlight
		messageElement.addClass("personal");
	}
	
	// replace URLs with links
    text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>');
  
	var content = '<tr>'
	              + '  <td class="date">' + util.timeString(time) + '</td>'
	              + '  <td class="nick">' + util.toStaticHTML(from) + '</td>'
	              + '  <td class="msg-text">' + text  + '</td>'
	              + '</tr>'
	              ;
	messageElement.html(content);

  $("#chat").append(messageElement);
  scrollDown();
}

function who(){
  webSocket.send("USERS");
}


// WebSocket handlers 
var webSocket;
var the_message;
function connectSocket() {
  webSocket = new WebSocket('ws://localhost:8080/chat');
  webSocket.onopen = function(event){
      showLoad();
      webSocket.send("NICK " + CONFIG.nick );
  };


  webSocket.onmessage = function(event){
    var object = JSON.parse(event.data);
    if (object.timestamp > CONFIG.last_message_time) {
      CONFIG.last_message_time = message.timestamp;
    }
    switch (object.type) {
      case "RPL_WELCOME":
        showChat();
        who();
        break;
      case "MSG":
        addMessage(object.nick, object.text, object.timestamp);  
        break;
      case "JOIN":
        userJoin(object.nick, object.timestamp);
        break;
      case "PART":
        userPart(object.nick, object.timestamp); 
        break;
      case "RPL_USERS":
        nicks = object.nicks;
        updateUsersLink();
        break;
        
    }

  };

  webSocket.onclose = function(event){
      alert('Server closed connection');
      showConnect();
  }; 
}


// Document Ready 
$(document).ready(function() {
  
  // Event Handlers
  
  $('#entry').keypress(function (e) {
    if (e.keyCode != 13 /* Return */) return;
    var msg = $("#entry").attr("value").replace("\n", "");
    if (!util.isBlank(msg)) webSocket.send("MSG " + msg );
    $("#entry").attr("value", ""); // clear the entry field
  });
  
  $('#usersLink').click(outputUsers);
  
  $('#login_form').submit(function() {
    var nick = $('#nick').attr("value");
    // validate nick length
    if (nick.length > 50) {
      alert("Nick too long. 50 character max.");
      showConnect();
      return false;
    }
    // validate nick composition
    if (/[^\w_\-^!]/.exec(nick)) {
      alert("Bad character in nick. Can only have letters, numbers, and '_', '-', '^', '!'");
      showConnect();
      return false;
    }
    
    // all is fine, let's proceed
    CONFIG.nick = nick;
    connectSocket();
    return false;
    
  });
  
  // update the clock every second
  setInterval(function () {
    var now = new Date();
    $("#currentTime").text(util.timeString(now));
  }, 1000);
  
  
  // prep the screen
  showConnect();
});