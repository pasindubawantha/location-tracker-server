const express = require('express')
const firebase = require('firebase')
const environment = require('./environment')
const PORT = process.env.PORT || 5000
const app = express()
const bodyParser = require('body-parser')
const request = require('request');

firebase.initializeApp(environment.firebase);

const db = firebase.database();

var usersRef = db.ref("users/");
var homeRef = db.ref("home/");
var notificationRef =db.ref('/home/notifaction_on');


var sendMessageOn = 1;

notificationRef.on("value", function(n) {
  sendMessageOn = n.val()
}, function (errorObject) {
  console.log("error reading notification status" + errorObject.code);
});


function handleMessage(sender_psid, received_message) {

  	let response;
  	homeRef.update({fb_puid:sender_psid})
  	if(sendMessageOn == 1){
  		response = {
		  "attachment": {
		    "type": "template",
		    "payload": {
			  "template_type":"button",
			  "text":"Notifications is turned on. do u want to turn it off",
			  "buttons":[
		          {
		            "type": "postback",
		            "title": "Turn off",
		            "payload": "off",
		          }
			  ]
			}
		  }
		}
  	} else {
  		response = {
		  "attachment": {
		    "type": "template",
		    "payload": {
			  "template_type":"button",
			  "text":"Notifications is turned off. do u want to turn it on",
			  "buttons":[
		          {
		            "type": "postback",
		            "title": "Turn on",
		            "payload": "on",
		          }
			  ]
			}
		  }
		}

  	}
	
  
  // Sends the response message
  callSendAPI(sender_psid, response);    
}

function handlePostback(sender_psid, received_postback) {
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'on') {
  	sendMessageOn = 1 
  	notificationRef.set(1)
    response = { "text": "Notoficaions are On" }
  } else if (payload === 'off') {
  	sendMessageOn = 0
  	notificationRef.set(0)
    response = { "text": "Notoficaions are Off" }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
	const PAGE_ACCESS_TOKEN = environment.fb_messnger.page_access_token;
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

function sendAlltert(sender_psid,alert_object) {
	if(sender_psid){
		callSendAPI(sender_psid,JSON.stringify(alert_object))
	}
	
}

function measure(lat1, lon1, lat2, lon2){  // generally used geo measurement function
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d * 1000; // meters
}


homeRef.on("value", function(home) {
	var home = home.val()
  	usersRef.on("value", function(users) {
  		var users = users.val()
  		var x1 = home.location.lat
  		var y1 = home.location.lng
  		for(var j=0; j<home.monitor_users.length; j++){
  				users[home.monitor_users[j]].data.sort(function (data1, data2) {
				  return parseInt(data2['time_sec']) - parseInt(data1['time_sec']);
				})
				var i=0 
  				if(users[home.monitor_users[j]].data[i] != null){
  					if(users[home.monitor_users[j]].data[i]['location_time_net'] !== "%LOCNTMS" && parseInt(users[home.monitor_users[j]].data[i]['location_time']) < parseInt(users[home.monitor_users[j]].data[i]['location_time_net']) ) {
							var location = users[home.monitor_users[j]].data[i]['location_net'].split(",")
							var accuracy = parseInt(users[home.monitor_users[j]].data[i]['location_accuracy_net'])
							var loc_time = parseInt(users[home.monitor_users[j]].data[i]['location_time_net'])
						} else {
							var location = users[home.monitor_users[j]].data[i]['location'].split(",")
							var accuracy = parseInt(users[home.monitor_users[j]].data[i]['location_accuracy'])
							var loc_time = parseInt(users[home.monitor_users[j]].data[i]['location_time'])
						}

						var time_sec = parseInt(users[home.monitor_users[j]].data[i]['time_sec'])
						var loc_time = parseInt(users[home.monitor_users[j]].data[i]['location_time'])
						var time = users[home.monitor_users[j]].data[i]['date'].concat(" ",users[home.monitor_users[j]].data[i]['time'], "(".concat("",users[home.monitor_users[j]].data[i]['location_speed']).concat("",")"))
						var position = {lat: parseFloat(location[0]), lng: parseFloat(location[1])}
	  				var x2 = location[0] 
	  				var y2 = location[1]
	  				if(home.notifaction_on == 1){
	  					var distance = measure(x1,y1,x2,y2)
	  					console.log(time + " User : " + home.monitor_users[j] + " Distance : " + distance +" meters ");
	  					if(distance <= home.alert_radius){
	  						var alert_object = JSON.parse(JSON.stringify(users[home.monitor_users[j]].data[i]))
	  						sendAlltert(home.fb_puid, time + " User : " + home.monitor_users[j] + " Distance : " + distance +" meters " )
	  					}
	  				}
	  				
  				}
  			}
	  //console.log(users.val());
	}
	, function (error) {
	  console.log("Failed to read users: " + error.code);
	});
}
, function (error) {
  console.log("failed to read home : " + error.code);
});



app.use(bodyParser.json())

app.get('/', function(req, res) {
	res.send('go to /fb')
})


app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Get the webhook event. entry.messaging is an array, but 
      // will only ever contain one event, so we get index 0
      if(entry.messaging){
      	let webhook_event = entry.messaging[0];
      }else if(entry.standby){
      	let webhook_event = entry.standby[0];
      }
      
      if(webhook_event){
	      // Get the sender PSID
		  let sender_psid = webhook_event.sender.id;
		  console.log('Sender PSID: ' + sender_psid);

		  // Check if the event is a message or postback and
		  // pass the event to the appropriate handler function
		  if (webhook_event.message) {
		    handleMessage(sender_psid, webhook_event.message);        
		  } else if (webhook_event.postback) {
		    handlePostback(sender_psid, webhook_event.postback);
		  }
      }else{
      	console.log("Event not identified");
      	console.log(entry);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = environment.fb_messnger.my_verify_token
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

app.get('/fb', (req, res)=> {
	res.status(200).send('<!doctype html><html lang="en"><body><a gref="http://m.me/hollydogeness"> Go to link and send message to start notifications </a></body></html>')

})


app.listen(PORT, () => console.log('LocationTracker server is listening on port '.concat('',PORT)))

