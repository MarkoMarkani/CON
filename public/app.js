var OV;
var session;
var roomId; // Name of the video session the user will connect to
var token; // Token retrieved from OpenVidu Server
var sessionId;
var gSessionId;
var loggedIn = false;
var OPENVIDU_SERVER_URL = "https://localhost:4443";
var OPENVIDU_SERVER_SECRET = "MY_SECRET";
var globalUserId;
/* OPENVIDU METHODS */
//ON DEV?GRANA1 
//sa async vraca promise
function joinSession() {

	sendIpAddress().
	then(ip => {
		console.log(ip);
		return logIn(ip);
	}).
	then(loginInfo => {
			// Random nickName and session
			console.log(loginInfo);
			console.log("AFTER YOU HAVE LOGGED IN ");
			loggedIn = true;
			if (loginInfo.role === "SUBSCRIBER") {
				console.log(`Role is ${loginInfo.role}`);
			} else {
				console.log("Role is publisher");
			}
			console.log(loginInfo.userId);
			userRole = loginInfo.role;
			globalUserId = loginInfo.userId;

			OV = new OpenVidu();
			session = OV.initSession();

			session.on('streamCreated', (event) => {
				// loggedIn;
				// console.log(loggedIn);
				console.log("ON STREAM CREATED");

				if (userRole) {
					console.log("ON STREAM CREATED IF SUBSCRIBER");
					var subscriber = session.subscribe(event.stream, 'video-container');
                        console.log(event.stream);
					subscriber.on('videoElementCreated', (event) => {
                        console.log(event);
						var userData = {
							userName: roomId
						}; //provericemo ovo
						// Add a new HTML element for the user's name and nickname over its video
						console.log(userData);
						/*jshint -W087 */
						debugger;
						appendUserData(event.element, userData);
						console.log("You see this after the stream if you are a Subscriber");
					});
				} else {
					console.log("You can not see the stream-you are a Publisher");
					console.log("ON STREAM CREATED IF PUBLISHER");
				}
			});
			// On every Stream destroyed...
			session.on('streamDestroyed', (event) => {
				// Delete the HTML element with the user's name and nickname
				removeUserData(event.stream.connection);
			});

			return createSession(sessionId);
		})
		.then(sessionId => { 

			console.log(sessionId);
			console.log(roomId);
			if(sessionId===undefined){
				sessionId=roomId;
			}else{
			gSessionId=sessionId;
			}
			// roomId=sessionId;
			// console.log(sessionId);
			return createToken(sessionId);
		}).
	then((token) => session.connect(token)).
	then(() => {
			$("#name-user").text(user);
			$("#not-logged").hide();
			$("#logged").show();
			console.log(roomId);
			console.log(gSessionId);
			// --- 5) Set page layout for active call ---
			var path = (location.pathname.slice(-1) == "/" ? location.pathname : location.pathname + "/");
			window.history.pushState("", "", path + '#' + gSessionId);
			console.log("Here is room id after CONNECT " + roomId);
			console.log("Here is gSessionId id after CONNECT " + gSessionId);
			// urlId = sessionId;
			var userName = $("#user").val();
			$('#session-title').text(gSessionId);
			$('#join').hide();
			$('#session').show();

			if (!userRole) {
				var publisher = OV.initPublisher(

				);
				
				$('#video-container').hide();

				publisher.on('videoElementCreated', (event) => {
                    console.log(event);
					var userData = {
						userName: userName
					};
					initMainVideo(event.element, userData);
					appendUserData(event.element, userData);
					$(event.element).prop('muted', true); // Mute local video
					console.log("Trenutno se snima...");
				});


				session.publish(publisher);
				sessionId = session.sessionId;
				console.log("OpenVidu session id ", sessionId);
				console.log("(AFTER CONNECT) i posle PUBLISH-a ");

				return sendSessionFromFront();

			} else {
				console.log("AFTER CONNECT IF IT IS SUBSCRIBER");
				console.warn('(AFTER CONNECT) You dont have permission to publish');

			}
			// return sendSessionFromFront();
		})
		.then(value => {
			console.log("Session id from front sent " + value);
		// 	return sendKafkaInfo();     //Ovako dobijamo Kafka info prilikom Join sesije!!!         Ovako ili direktno preko dugmeta Notify
		// })
		// .then(kafkaInfo=>{
        // console.log(kafkaInfo);
		}
		)
		.catch((error) => {
			console.log(error);
			return false;
		});

}

function createToken(sId) { // See https://openvidu.io/docs/reference-docs/REST-API/#post-apitokens
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: OPENVIDU_SERVER_URL + "/api/tokens",
			data: JSON.stringify({
				session: sId
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*'
			},
			success: response => resolve(response.token),
			error: error => reject(error)
		});
	});
}



function showSessions() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			url: OPENVIDU_SERVER_URL + "/api/sessions",
			data: JSON.stringify({}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*'
			},
			success: response => resolve(response),
			error: (error) => {
				if (error.status === 409) {
					reject("Something happened 409");
				} else {
					console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
					if (window.confirm('No connection to OpenVidu Server. This may be a certificate error at \"' + OPENVIDU_SERVER_URL + '\"\n\nClick OK to navigate and accept it. ' +
							'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' + OPENVIDU_SERVER_URL + '"')) {
						location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
					}
				}
			}
		});
	});
}


function leaveSession() {

	// --- 9) Leave the session by calling 'disconnect' method over the Session object ---

	session.disconnect();
	session = null;

	// Removing all HTML elements with the user's nicknames
	cleanSessionView();

	$('#join').show();
	$('#session').hide();
}

/* OPENVIDU METHODS */



/* APPLICATION REST METHODS */

function logIn(ip) {
	roomId = window.location.hash.slice(1);
	if (!roomId) {
		roomId = sessionId;
		console.log("No user id provided");
	}
	var user = $("#user").val(); // Username
	var pass = $("#pass").val(); // Password


	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: 'api-login/login',
			data: JSON.stringify({
				user: user,
				pass: pass,
				userId: roomId,
				ip: ip
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*'
			},
			success: response => resolve(response),
			error: (error) => {
				reject(error);

			}
		});
	});
}

function showLogIn() {
	$("#not-logged").show();
	$("#logged").hide();
}

function logOut() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: "api-login/logout",
			data: JSON.stringify({
				customSessionId: sId
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*'

			},
			success: response => resolve(response),
			error: (error) => {
				if (error.status === 409) {
					reject("Something happened 409");
				} else {
					console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
					if (window.confirm('No connection to OpenVidu Server. This may be a certificate error at \"' + OPENVIDU_SERVER_URL + '\"\n\nClick OK to navigate and accept it. ' +
							'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' + OPENVIDU_SERVER_URL + '"')) {
						location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
					}
				}
			}
		});
	});
}

function createSession(sId) {
	console.log(globalUserId);
	if(globalUserId){
	sId = globalUserId+"-"+makeid(20);
	}
	else{
    sId=window.location.hash.slice(1);
	}
	
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: OPENVIDU_SERVER_URL + "/api/sessions",
			data: JSON.stringify({
				customSessionId: sId,
				recordingMode: "ALWAYS",
				defaultOutputMode: "INDIVIDUAL"
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*'
			},
			success: response => resolve(response.id),
			error: (error) => {
				if (error.status === 409) {
					resolve(undefined);
				} else {
					console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
					if (window.confirm('No connection to OpenVidu Server. This may be a certificate error at \"' + OPENVIDU_SERVER_URL + '\"\n\nClick OK to navigate and accept it. ' +
							'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' + OPENVIDU_SERVER_URL + '"')) {
						location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
					}
				}
			}
		});
	});
}

// function getToken(mySessionId) {

// 	return createSession(mySessionId).then((value)=>{console.log(value);return value;}).then(sId => createToken(sId));


// }
var findIP = new Promise(r => {
	var w = window,
		a = new(w.RTCPeerConnection || w.mozRTCPeerConnection || w.webkitRTCPeerConnection)({
			iceServers: []
		}),
		b = () => {};
	a.createDataChannel("");
	a.createOffer(c => a.setLocalDescription(c, b, b), b);
	a.onicecandidate = c => {
		try {
			// console.log(c.candidate.candidate)
			c.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g).forEach(r);
		} catch (e) {}
	};
	
});

/*Usage example*/


function sendSessionFromFront() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: "api-sessions/sendSessionFromFront",
			data: JSON.stringify({
				sessionId: sessionId,
				roomId:roomId
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*'
			},
			success: response => {
				console.log("In success");
				console.log(response);
				return resolve(response.sessionId);
			},
			error: (error) => {
				console.log("In error");
				if (error.status === 409) {
					reject("Something happened 409");
				} else {
					console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
					if (window.confirm('No connection to OpenVidu Server. This may be a certificate error at \"' + OPENVIDU_SERVER_URL + '\"\n\nClick OK to navigate and accept it. ' +
							'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' + OPENVIDU_SERVER_URL + '"')) {
						location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
					}
				}
			}
		});
	});
}

function sendIpAddress() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			 url: "/api-sessions/fetchip",
			data: JSON.stringify({
				
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*"
			},
			success: response => {
				console.log("In success");
			
				return resolve(response.ip);
			},
			error: (error) => {
				console.log("In error");
				if (error.status === 409) {
					reject("Something happened 409");
				} else {
					console.warn('Something went wrong');
				
				}
			}
		});
	});
}



function sendKafkaInfo() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "GET",
			 url: "/api-sessions/sendFetchedSession",
			data: JSON.stringify({
				
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*"
			},
			success: response => {
				console.log("In success");
				return resolve(response);
			},
			error: (error) => {
				console.log("In error");
				if (error.status === 409) {
					reject("Something happened 409");
				} else {
					console.warn('Something went wrong');
				
				}
			}
		});
	});
}



function redirect() {
	window.location = "/";
}


function removeUser() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: "api-sessions/remove-user",
			data: JSON.stringify({
				roomId: roomId,
				token: token
			}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*'
			},
			success: response => resolve(response.roomId, response.token),

			error: (error) => {
				reject(error);

			}
		});
	});
}



/* APPLICATION REST METHODS */



/* APPLICATION BROWSER METHODS */

window.addEventListener('load', function () {
	roomId = window.location.hash.slice(1); // For 'https://myurl/#roomId', sessionId would be 'roomId'
	console.log("Before Joining Session");

	if (roomId) {
		// The URL has a session id. Join the room right away
		console.log("Joining the room with id  " + roomId);
		$('#join').show();
		$('#session').hide();
	} else {
		// The URL has not a session id. Show welcome page
		$('#join').show();
		$('#session').hide();

	}
});


window.onbeforeunload = () => { // Gracefully leave session
	if (session) {
		removeUser();
		// debugger;
		leaveSession();
	}

};

function appendUserData(videoElement, connection) {
	var clientData;
	var serverData;
	var nodeId;
	if (connection.userName) { // Appending local video data
		serverData = connection.userName;
		nodeId = 'main-videodata';
	} else {
		serverData = JSON.parse(connection.data.split('%/%')[0]).serverData;
		nodeId = connection.connectionId;
	}
	var dataNode = document.createElement('div');
	dataNode.className = "data-node";
	dataNode.id = "data-" + nodeId;
	dataNode.innerHTML = "<p class='userName'>" + serverData + "</p>";
	videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
	addClickListener(videoElement, clientData, serverData);
}

function removeUserData(connection) {
	var userNameRemoved = $("#data-" + connection.connectionId);
	if ($(userNameRemoved).find('p.userName').html() === $('#main-video p.userName').html()) {
		cleanMainVideo(); // The participant focused in the main video has left
	}
	$("#data-" + connection.connectionId).remove();
}

function removeAllUserData() {
	$(".data-node").remove();
}

function cleanMainVideo() {
	$('#main-video video').get(0).srcObject = null;
	$('#main-video p').each(function () {
		$(this).html('');
	});
}

function addClickListener(videoElement, clientData, serverData) {
	videoElement.addEventListener('click', function () {
		var mainVideo = $('#main-video video').get(0);
		if (mainVideo.srcObject !== videoElement.srcObject) {
			$('#main-video').fadeOut("fast", () => {
				$('#main-video p.userName').html(serverData);
				mainVideo.srcObject = videoElement.srcObject;
				$('#main-video').fadeIn("fast");
			});
		}
	});
}

function initMainVideo(videoElement, userData) {
	$('#main-video video').get(0).srcObject = videoElement.srcObject;
	$('#main-video p.userName').html(userData.userName);
	$('#main-video video').prop('muted', true);
}

function initMainVideoThumbnail() {
	$('#main-video video').css("background", "url('images/subscriber-msg.jpg') round");
}

function isPublisher(userName) {
	return userName.includes('publisher');
}

function isSubscriber(userName) {
	return userName.includes('subscriber');
}

function cleanSessionView() {
	removeAllUserData();
	cleanMainVideo();
	$('#main-video video').css("background", "");
}

/* APPLICATION BROWSER METHODS */


function makeid(length) {
	var result = '';
	var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}