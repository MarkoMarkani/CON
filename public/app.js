var OV;
var session;
var roomId;	// Name of the video session the user will connect to
var token;			// Token retrieved from OpenVidu Server
var sessionId;
var loggedIn = false;
var OPENVIDU_SERVER_URL = "https://localhost:4443";
var OPENVIDU_SERVER_SECRET = "MY_SECRET";
/* OPENVIDU METHODS */
//ON DEV?GRANA1 
function joinSession() {
	// roomId = window.location.hash.slice(1);
	// if (!roomId) {

	// 	roomId = makeid(15);
	// }


	logIn().
		then(value => {
			$("#name-user").text(user);
			$("#not-logged").hide();
			$("#logged").show();
			// Random nickName and session
			console.log(value);
			console.log("AFTER YOU HAVE LOGGED IN ");
			loggedIn = true;
			return value;
		}).
		then(value => {
			console.log(value.role);
			userRole = value.role;

			OV = new OpenVidu();

			session = OV.initSession();

			session.on('streamCreated', (event) => {
				// loggedIn;
				// console.log(loggedIn);
				console.log("ON STREAM CREATED");

				if (userRole) {
					console.log("ON STREAM CREATED IF SUBSCRIBER");
					var subscriber = session.subscribe(event.stream, 'video-container');


					subscriber.on('videoElementCreated', (event) => {

						var userData = { userName: roomId }; //provericemo ovo
						// Add a new HTML element for the user's name and nickname over its video
						appendUserData(event.element, userData);
						console.log("POSLE STREAMA OVO VIDIS AKO SI SUBSCRIBER")
					});
				} else {
					console.log("Ne mozes da vidis stream-publisher si");
					console.log("ON STREAM CREATED IF PUBLISHER");
				}
			});
			// On every Stream destroyed...
			session.on('streamDestroyed', (event) => {
				// Delete the HTML element with the user's name and nickname
				removeUserData(event.stream.connection);
			});
		})

	createSession(sessionId)
		.then(sessionId => {
			console.log(sessionId);
			roomId = window.location.hash.slice(1);
			if (!roomId) {

				roomId = sessionId;
			}
			sessionId = roomId;
			console.log(sessionId);
			// debugger;
			return sessionId;
			// session.connect(token)})
		}).
		then(sessionId => { return createToken(sessionId) }).
		then((token) => session.connect(token)).
		then(() => {
			console.log(roomId);
			console.log(sessionId);
			// --- 5) Set page layout for active call ---
			var path = (location.pathname.slice(-1) == "/" ? location.pathname : location.pathname + "/");
			window.history.pushState("", "", path + '#' + roomId);
			console.log("Here is room id after CONNECT " + roomId);
			// urlId = sessionId;
			var userName = $("#user").val();
			$('#session-title').text(roomId);
			$('#join').hide();
			$('#session').show();

			if (!userRole) {
				var publisher = OV.initPublisher();
				$('#video-container').hide();

				publisher.on('videoElementCreated', (event) => {

					var userData = {
						userName: userName
					};
					initMainVideo(event.element, userData);
					appendUserData(event.element, userData);
					$(event.element).prop('muted', true); // Mute local video
					console.log("Trenutno se snima...")
				});


				session.publish(publisher);
				sessionId = session.sessionId;
				console.log("OpenVidu session id ", sessionId);
				console.log("(AFTER CONNECT) i posle PUBLISH-a ");

				sendSessionFromFront();

			} else {
				console.log("AFTER CONNECT IF IT IS SUBSCRIBER")
				console.warn('(AFTER CONNECT) You dont have permission to publish');

			}
		})

	return false;

}

function createToken(sId) { // See https://openvidu.io/docs/reference-docs/REST-API/#post-apitokens
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: OPENVIDU_SERVER_URL + "/api/tokens",
			data: JSON.stringify({ session: sId }),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*',
				"Authorization": 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET')
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
			url: "https://localhost:4443/api/sessions",
			data: JSON.stringify({}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*',
				"Authorization": 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET')
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

function logIn() {
	var user = $("#user").val(); // Username
	var pass = $("#pass").val(); // Password


	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: 'api-login/login',
			data: JSON.stringify({ user: user, pass: pass }),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*',
				"Authorization": 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET')
			},
			success: response => resolve(response),
			// $("#name-user").text(user);
			// $("#not-logged").hide();
			// $("#logged").show();
			// // Random nickName and session
			// console.log(response);
			// console.log(response.role);
			// userRole=response.role;
			// console.log("AFTER YOU HAVE LOGGED IN ");
			// loggedIn=true;),
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
			data: JSON.stringify({ customSessionId: sId }),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*',
				"Authorization": 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET')

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

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: OPENVIDU_SERVER_URL + "/api/sessions",
			data: JSON.stringify({ customSessionId: sId,recordingMode: "ALWAYS", defaultOutputMode: "INDIVIDUAL"}),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*',
				"Authorization": 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET')
			},
			success: response => resolve(response.id),
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

// function getToken(mySessionId) {

// 	return createSession(mySessionId).then((value)=>{console.log(value);return value;}).then(sId => createToken(sId));


// }

function sendSessionFromFront() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: "api-sessions/sendSessionFromFront",
			data: JSON.stringify({ sessionId: sessionId, roomId: roomId }),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*',
				"Authorization": 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET')
			},
			success: response => resolve(response.sessionId, response.roomId),
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
function redirect() {
	window.location = "/"
}


function removeUser() {

	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: "api-sessions/remove-user",
			data: JSON.stringify({ roomId: roomId, token: token }),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json",
				'Access-Control-Allow-Origin': '*',
				"Authorization": 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET')
			},
			success: response => resolve(response.roomId, response.token),

			error: (error) => {
				reject(error)
				debugger;
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
		console.log("Subscribing to a room with id  " + roomId);
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
		debugger;
		leaveSession();
	}

}

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














// var OV;
// var session;
// var roomId;	// Name of the video session the user will connect to
// var token;			// Token retrieved from OpenVidu Server
// var sessionId;
// var loggedIn=false;

// /* OPENVIDU METHODS */
// //ON DEV?GRANA1 
// function joinSession() {
// 	roomId = window.location.hash.slice(1);
// 	if (!roomId) {
// 		// If the user is joining to a new room
// 		roomId = makeid(15);
// 	}
// 	getToken((token) => {
// 		// --- 1) Get an OpenVidu object ---

// 		OV = new OpenVidu();

// 		// --- 2) Init a session ---

// 		session = OV.initSession();

// 		// --- 3) Specify the actions when events take place in the session ---

// 		// On every new Stream received...
// 		logIn(()=>{
// 		session.on('streamCreated', (event) => {
// 			loggedIn;
// 			console.log(loggedIn);
// 			console.log("ON STREAM CREATED");

// 			if (userRole) {
// 				console.log("ON STREAM CREATED IF SUBSCRIBER");
// 				var subscriber = session.subscribe(event.stream, 'video-container');

// 				// When the HTML video has been appended to DOM...
// 				subscriber.on('videoElementCreated', (event) => {
// 					// logIn();
// 					var userData = { userName: roomId }; //provericemo ovo
// 					// Add a new HTML element for the user's name and nickname over its video
// 					appendUserData(event.element, userData);
// 					console.log("POSLE STREAMA OVO VIDIS AKO SI SUBSCRIBER")
// 				});
// 			} else {
// 				console.log("Ne mozes da vidis stream-publisher si");
// 				console.log("ON STREAM CREATED IF PUBLISHER");
// 			}
// 		});

// 		// On every Stream destroyed...
// 		session.on('streamDestroyed', (event) => {
// 			// Delete the HTML element with the user's name and nickname
// 			removeUserData(event.stream.connection);
// 		});

// 		session.connect(token)
// 			.then(() => {

// 				// --- 5) Set page layout for active call ---
// 				var path = (location.pathname.slice(-1) == "/" ? location.pathname : location.pathname + "/");
// 				window.history.pushState("", "", path + '#' + roomId);
// 				console.log("Here is room id after CONNECT " + roomId);
// 				// urlId = sessionId;
// 				var userName = $("#user").val();
// 				$('#session-title').text(roomId);
// 				$('#join').hide();
// 				$('#session').show();


// 				if (!userRole) {
//                     console.log("AFTER CONNECT IF IS PUBLISHER");
// 					// --- 6) Get your own camera stream ---

// 					var publisher = OV.initPublisher();
// 					$('#video-container').hide();
// 					// --- 7) Specify the actions when events take place in our publisher ---

// 					// When our HTML video has been added to DOM...
// 					publisher.on('videoElementCreated', (event) => {
// 						// Init the main video with ours and append our data
// 						var userData = {
// 							userName: userName
// 						};
// 						initMainVideo(event.element, userData);
// 						appendUserData(event.element, userData);
// 						$(event.element).prop('muted', true); // Mute local video
// 						console.log("Trenutno se snima...")
// 					});


// 					// --- 8) Publish your stream ---

// 					session.publish(publisher);
// 					sessionId = session.sessionId;
// 					console.log("OpenVidu session id ", sessionId);
// 					console.log("(AFTER CONNECT) i posle PUBLISH-a ");
// 					sendSessionFromFront();
// 				} else {
// 					console.log("AFTER CONNECT IF IT IS SUBSCRIBER")
// 					console.warn('(AFTER CONNECT) You dont have permission to publish');

// 				}
// 			})
// 			.catch(error => {
// 				console.warn('There was an error connecting to the session:', error.code, error.message);
// 			});
// 	});
// 	});
// 	return false;
// }

// function showSessions() {
// 	httpGetRequest(
// 		`https://localhost:4443/api/sessions`,
// 		{},
// 		'Failed to fetch sessions',
// 		res => {
// 			console.log("Here we see all the sessions :" + JSON.stringify(res));
// 			return JSON.stringify(res);
// 		}
// 	);
// }


// function leaveSession() {

// 	// --- 9) Leave the session by calling 'disconnect' method over the Session object ---

// 	session.disconnect();
// 	session = null;

// 	// Removing all HTML elements with the user's nicknames
// 	cleanSessionView();

// 	$('#join').show();
// 	$('#session').hide();
// }

// /* OPENVIDU METHODS */



// /* APPLICATION REST METHODS */

// function logIn(callback) {
// 	var user = $("#user").val(); // Username
// 	var pass = $("#pass").val(); // Password

// 	httpPostRequest(
// 		'api-login/login',
// 		{ user: user, pass: pass },
// 		'Login WRONG',
// 		(response) => {
// 			$("#name-user").text(user);
// 			$("#not-logged").hide();
// 			$("#logged").show();
// 			// Random nickName and session
// 			console.log(response);
// 			console.log(response.role);
// 			userRole=response.role;
// 			console.log("AFTER YOU HAVE LOGGED IN ");
// 			loggedIn=true;
// 			callback();

// 		}
// 	);
// 	// debugger;
// }

// function showLogIn() {
// 	$("#not-logged").show();
// 	$("#logged").hide();
// }

// function logOut() {
// 	httpPostRequest(
// 		'api-login/logout',
// 		{},
// 		'Logout WRONG',
// 		(response) => {
// 			$("#not-logged").show();
// 			$("#logged").hide();
// 		}
// 	);
// }

// function getToken(callback) {

// 	httpPostRequest(
// 		'api-sessions/get-token',
// 		{ 
// 			// roomId:roomId
// 		 },
// 		'Request of TOKEN gone WRONG:',
// 		(response) => {
// 			token = response[0]; // Get token from response
// 			console.warn('Request of TOKEN gone WELL (TOKEN:' + token + ')');
// 			callback(token); // Continue the join operation
// 		}
// 	);
// }

// function sendSessionFromFront() {

// 	httpPostRequest(
// 		'api-sessions/sendSessionFromFront',
// 		{
// 			sessionId: sessionId,
// 			roomId: roomId
// 		},
// 		'Request gone WRONG:',
// 		(response) => {
// 		console.log(response);
// 		}
// 	);
// }


// 	function redirect() {
// 		window.location = "/"
// 	}


// function removeUser() {
// 	httpPostRequest(
// 		'api-sessions/remove-user',
// 		{ roomId: roomId, token: token },
// 		'User couldn\'t be removed from session',
// 		(response) => {

// 			console.warn("You have been removed from session " + roomId);
// 		}
// 	);
// }


// function httpPostRequest(url, body, errorMsg, callback) {
// 	var http = new XMLHttpRequest();
// 	http.open('POST', url, true);
// 	http.setRequestHeader('Content-type', 'application/json');
// 	http.addEventListener('readystatechange', processRequest, false);
// 	http.send(JSON.stringify(body));

// 	function processRequest() {
// 		if (http.readyState == 4) {
// 			if (http.status == 200) {
// 				try {
// 					callback(JSON.parse(http.responseText));
// 				} catch (e) {
// 					callback();
// 				}
// 			} else {
// 				console.warn(errorMsg);
// 				console.warn(http.responseText);
// 			}
// 		}
// 	}
// }

// function httpGetRequest(url, body, errorMsg, callback) {
// 	var http = new XMLHttpRequest();
// 	http.open('GET', url, true);
// 	http.setRequestHeader('Content-type', 'application/json');
// 	http.setRequestHeader('Access-Control-Allow-Origin', '*');
// 	http.setRequestHeader("Authorization", 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET'));
// 	http.addEventListener('readystatechange', processRequest, false);
// 	http.send(JSON.stringify(body));

// 	function processRequest() {
// 		if (http.readyState == 4) {
// 			if (http.status == 200) {
// 				try {
// 					callback(JSON.parse(http.responseText));
// 				} catch (e) {
// 					callback();
// 				}
// 			} else {
// 				console.warn(errorMsg);
// 				console.warn(http.responseText);
// 			}
// 		}
// 	}
// }
// /* APPLICATION REST METHODS */



// /* APPLICATION BROWSER METHODS */

// window.addEventListener('load', function () {
// 	roomId = window.location.hash.slice(1); // For 'https://myurl/#roomId', sessionId would be 'roomId'
// 	console.log("Before Joining Session");

// 	if (roomId) {
// 		// The URL has a session id. Join the room right away
// 		console.log("Subscribing to a room with id  " + roomId);
// 		$('#join').show();
// 		$('#session').hide();
// 	} else {
// 		// The URL has not a session id. Show welcome page
// 		$('#join').show();
// 		$('#session').hide();

// 	}
// });


// window.onbeforeunload = () => { // Gracefully leave session
// 	if (session) {
// 		removeUser();
// 		leaveSession();
// 	}
// 	// logOut();
// }

// function appendUserData(videoElement, connection) {
// 	var clientData;
// 	var serverData;
// 	var nodeId;
// 	if (connection.userName) { // Appending local video data
// 		serverData = connection.userName;
// 		nodeId = 'main-videodata';
// 	} else {
// 		serverData = JSON.parse(connection.data.split('%/%')[0]).serverData;
// 		nodeId = connection.connectionId;
// 	}
// 	var dataNode = document.createElement('div');
// 	dataNode.className = "data-node";
// 	dataNode.id = "data-" + nodeId;
// 	dataNode.innerHTML = "<p class='userName'>" + serverData + "</p>";
// 	videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
// 	addClickListener(videoElement, clientData, serverData);
// }

// function removeUserData(connection) {
// 	var userNameRemoved = $("#data-" + connection.connectionId);
// 	if ($(userNameRemoved).find('p.userName').html() === $('#main-video p.userName').html()) {
// 		cleanMainVideo(); // The participant focused in the main video has left
// 	}
// 	$("#data-" + connection.connectionId).remove();
// }

// function removeAllUserData() {
// 	$(".data-node").remove();
// }

// function cleanMainVideo() {
// 	$('#main-video video').get(0).srcObject = null;
// 	$('#main-video p').each(function () {
// 		$(this).html('');
// 	});
// }

// function addClickListener(videoElement, clientData, serverData) {
// 	videoElement.addEventListener('click', function () {
// 		var mainVideo = $('#main-video video').get(0);
// 		if (mainVideo.srcObject !== videoElement.srcObject) {
// 			$('#main-video').fadeOut("fast", () => {
// 				$('#main-video p.userName').html(serverData);
// 				mainVideo.srcObject = videoElement.srcObject;
// 				$('#main-video').fadeIn("fast");
// 			});
// 		}
// 	});
// }

// function initMainVideo(videoElement, userData) {
// 	$('#main-video video').get(0).srcObject = videoElement.srcObject;
// 	$('#main-video p.userName').html(userData.userName);
// 	$('#main-video video').prop('muted', true);
// }

// function initMainVideoThumbnail() {
// 	$('#main-video video').css("background", "url('images/subscriber-msg.jpg') round");
// }

// function isPublisher(userName) {
// 	return userName.includes('publisher');
// }

// function isSubscriber(userName) {
// 	return userName.includes('subscriber');
// }

// function cleanSessionView() {
// 	removeAllUserData();
// 	cleanMainVideo();
// 	$('#main-video video').css("background", "");
// }

// /* APPLICATION BROWSER METHODS */

// function makeid(length) {
// 	var result = '';
// 	var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
// 	var charactersLength = characters.length;
// 	for (var i = 0; i < length; i++) {
// 		result += characters.charAt(Math.floor(Math.random() * charactersLength));
// 	}
// 	return result;
// }
