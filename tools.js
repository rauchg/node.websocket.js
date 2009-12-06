/*
---
name: tools.js

description: Augments prototypes with some useful functions

author: [Guillermo Rauch](http://devthought.com)
...
*/

// from jQuery (Dual licensed under the MIT and GPL licenses.)
// Copyright (c) 2009 John Resig
this.isArray = function(obj) {
	return Object.prototype.toString.call(obj) === "[object Array]";
}

// from MooTools (MIT-style license)
// Copyright (c) 2009 Valerio Proietti
this.substitute = function(str, object, regexp){
	return str.replace(regexp || (/\\?\{([^{}]+)\}/g), function(match, name){
		if (match.charAt(0) == '\\') return match.slice(1);
		return (object[name] != undefined) ? object[name] : '';
	});
};

// dummy merge
this.merge = function(obj, newobj){
  if (!newobj) return obj;
  for (var i in newobj) obj[i] = newobj[i];
  return obj;
};

// reads argv, parses --option=value into {option: value}
this.argvToObject = function(argv){
  var obj = {}, regex = /\-\-(\w+)(\=(.+))?/;
  for (var i = 0, l = argv.length, match; i < l; i++){
    match = argv[i].match(regex);
    if (match) obj[match[1]] = match[3] !== undefined ? eval(match[3]) : null;
  }
  return obj;
};