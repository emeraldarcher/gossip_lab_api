var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var Message = require('./message');

var BearSchema   = new Schema({
	id: {type: String, index: {unique: true, dropDups: true}},
	name: String,
	token: String,
	messages: [Message.schema],
	received: [Message.schema]
});

module.exports = mongoose.model('Bear', BearSchema);
