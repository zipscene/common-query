var query = require('./query');
var update = require('./update');

var key;
for(key in query) exports[key] = query[key];
for(key in update) exports[key] = update[key];
