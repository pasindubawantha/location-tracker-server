const express = require('express')
const firebase = require('firebase')
const environment = require('./environment')
const PORT = process.env.PORT || 5000
const app = express()
const bodyParser = require('body-parser')

firebase.initializeApp(environment.firebase);

const db = firebase.database();

var usersRef = db.ref("users/");
var homeRef = db.ref("home/");

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

function sendAlltert(alert_object) {

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
	  					if(distance <= home.alert_radius){
	  						var alert_object = JSON.parse(JSON.stringify(users[home.monitor_users[j]].data[i]))
	  						sendAlltert(alert_object)
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


var state = "nothing"
app.use(bodyParser.json())

app.get('/fb_messager', function(req, res) {
	console.log(req.query['hub.challenge'])
	res.send(req.query['hub.challenge'])

})
app.get('/', function(req, res) {
	console.log(req)
	res.send(JSON.stringify(state))

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
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);
      
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
  const VERIFY_TOKEN = environment.fb_messnger.page_access_token;;
  
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


app.listen(PORT, () => console.log('Example app listening on port '.concat('',PORT)))

