var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var MessageSchema   = new Schema({
	type: String,
	text: String,
	uuid: String,
	sequence: Number//{type: Number, index: {unique: true, dropDups: true}},
});

module.exports = mongoose.model('Message', MessageSchema);
