// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');
var bodyParser = require('body-parser');
var app        = express();
var morgan     = require('morgan');
var autoIncrement = require('mongoose-auto-increment');
var cors = require('cors');
require('run-middleware')(app)
var https = require('https');

// configure app
app.use(morgan('dev')); // log requests to the console

// CORS
app.use(cors());

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port     = process.env.PORT || 8085; // set our port

var mongoose   = require('mongoose');
var connection = mongoose.createConnection("mongodb://localhost/apilab"); // connect to our database

autoIncrement.initialize(connection);

var BearModel     = require('./app/models/bear');
var MessageModel = require('./app/models/message');

MessageModel.schema.plugin(autoIncrement.plugin, { model: 'Message', field: 'sequence' });

var Bear = connection.model('Bear', BearModel.schema);
var Message = connection.model('Message', MessageModel.schema);

// ROUTES FOR OUR API
// =============================================================================

// create our router
var router = express.Router();

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
	res.json({ message: 'hooray! welcome to our api!' });
});

// on routes that end in /bears
// ----------------------------------------------------
router.route('/users')

	// create a bear (accessed at POST http://localhost:8080/bears)
	.post(function(req, res) {

		var bear = new Bear();		// create a new instance of the Bear model
		bear.id = req.query.id;
		bear.name = req.query.name;  // set the bears name (comes from the request)
		bear.token = req.query.token;

		bear.save(function(err) {
			if (err)
				res.send(err);

			res.json({ message: 'User created!' });
		});


	})

	// get all the bears (accessed at GET http://localhost:8080/api/bears)
	.get(function(req, res) {
		console.log("made it to the request at least");
		Bear.find(function(err, bears) {
			if (err)
				res.send(err);

			res.json(bears);
		});
	});

// on routes that end in /bears
// ----------------------------------------------------
router.route('/gossip/worker/:token')
	// Send a message to another node THIS IS WHAT HAPPENS WHEN A NODE RECEIVES A MESSAGE FROM ANOTHER NODE!!!
	.post(function(req, res) {

		var message = new Message();          // create a new instance of the Bear model
                message.type = req.body.type;
                message.text = req.body.text;
                message.uuid = req.body.uuid;
		message.sequence = req.body.sequence;

		if(message.type == 'rumor') {
			// store the message
			Bear.findOne({token: req.params.token}, function(err, bear) {
                        	if (err)
                                	res.send(err);

				console.log('bear');
                        	bear.received.push(message);
                        	bear.save(function(err) {
                                	if (err)
                                        	res.send(err);
					console.log('sending a success message');
                                	res.json({message: 'Message stored!'});
                        	});
                	});
		} else {
			// Handle want message
		}
	})

	// Randomly send messages out to other nodes
	.get(function(req, res) {
		// start message worker
		messageWorker(req.params.token);
		res.json({message: "Message Worker started!"});
	});

// Random number function
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Message Worker Function
function messageWorker(token)
{
	Bear.findOne({token: token}, {_id: 0, 'messages._id': 0}, function(err, from) {
                        if (err)
                                res.send(err);

			// Get a random message to send out
			var index = getRandomInt(0, from.messages.length-1);
			var message = from.messages[index];

                        // Get a random user to send the random message to
			Bear.find(function(err, bears) {
                        	if (err)
                                	res.send(err);

                        	var rnd = getRandomInt(0, bears.length-1);
				var to = bears[rnd];

				// All of this is to send the message to the user and store it in their document
				var options = {
  					hostname: 'emeraldelements.com',
  					port: 443,
					path: '/462api/gossip/worker/' + token,
					method: 'POST',
					headers: {
          					'Content-Type': 'application/json',
				        	'Content-Length': Buffer.byteLength(JSON.stringify(message))
      					}
				};

				var req = https.request(options, (res) => {
					res.setEncoding('utf8');
                			let rawData = '';
                			res.on('data', (chunk) => rawData += chunk);
                			res.on('end', () => {
                       	 			try {
                                			let parsedData = JSON.parse(rawData);
                                			console.log(parsedData);
                        			} catch (e) {
                                			console.log(e.message);
                        			}
                			});
				});

				req.on('error', (e) => {
  					console.error(e);
				});
				req.write(JSON.stringify(message));
				req.end();

                	});
                });

	setTimeout(messageWorker.bind(this,token), 60000);
}


router.route('/gossip/messages')

        // create a bear (accessed at POST http://localhost:8080/bears)
        .post(function(req, res) {

		console.log("made it to add message");

                var message = new Message();          // create a new instance of the Bear model
                message.type = req.body.type;
                message.text = req.body.text;
                message.uuid = req.body.uuid;
		if(req.body.sequence)
			message.sequence = req.body.sequence;

                Bear.findOne({token: message.uuid}, function(err, bear) {
                        if (err)
                                res.send(err);

                        bear.messages.push(message);
                        bear.save(function(err) {
                                if (err)
                                        res.send(err);

                                res.json({message: 'Message created!'});
                        });
                });
        })


        // get all the bears (accessed at GET http://localhost:8080/api/bears)
	.get(function(req, res) {
		var token = req.query.token;

                Bear.findOne({token: token}, {_id: 0, 'messages._id': 0}, function(err, bear) {
                        if (err)
                                res.send(err);

                        res.json(bear.messages);
                });
        });

router.route('/gossip/received')

        // DON'T USER THIS ONE!!!create a bear (accessed at POST http://localhost:8080/bears)
        .post(function(req, res) {

                var message = new Message();
                message.type = req.body.type;
                message.text = req.body.text;
                message.uuid = req.body.uuid;
                if(req.body.sequence)
                        message.sequence = req.body.sequence;

                Bear.findOne({token: message.uuid}, function(err, bear) {
                        if (err)
                                res.send(err);

                        bear.received.push(message);
                        bear.save(function(err) {
                                if (err)
                                        res.send(err);

                                res.json({message: 'Message stored!'});
                        });
                });
        })


        // get all the bears (accessed at GET http://localhost:8080/api/bears)
        .get(function(req, res) {
                var token = req.query.token;

                Bear.findOne({token: token}, {_id: 0, 'messages._id': 0}, function(err, bear) {
                        if (err)
                                res.send(err);

                        res.json(bear.received);
                });
        });

// on routes that end in /bears/:bear_id
// ----------------------------------------------------
router.route('/bears/:bear_id')

	// get the bear with that id
	.get(function(req, res) {
		Bear.findById(req.params.user_id, function(err, bear) {
			if (err)
				res.send(err);
			res.json(bear);
		});
	})

	// update the bear with this id
	.put(function(req, res) {
		Bear.findById(req.params.bear_id, function(err, bear) {

			if (err)
				res.send(err);

			bear.name = req.body.name;
			bear.save(function(err) {
				if (err)
					res.send(err);

				res.json({ message: 'Bear updated!' });
			});

		});
	})

	// delete the bear with this id
	.delete(function(req, res) {
		Bear.remove({
			_id: req.params.bear_id
		}, function(err, bear) {
			if (err)
				res.send(err);

			res.json({ message: 'Successfully deleted' });
		});
	});


// REGISTER OUR ROUTES -------------------------------
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
