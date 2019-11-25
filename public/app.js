var OV;
var session;
var globalSessionId;
var sessionName;	// Name of the video session the user will connect to
var token;			// Token retrieved from OpenVidu Server
var sessionId;
var globalOV;
/* OPENVIDU METHODS */
//U GRANI DEV?GRANA! SMO
function joinSession() {
    // sessionId = window.location.hash.slice(1);
	// if (!sessionId) {
	// 	// If the user is joining to a new room
	// 	sessionId=session.sessionId
	// }
	//sessionName = makeid(15);
	OV = new OpenVidu();
	globalOV=JSON.stringify(OV);
	// --- 2) Init a session ---
	session = OV.initSession();
	var keys=Object.getOwnPropertyNames(OV.session);
	for(let key of keys){
		console.log(key);
		console.log(OV[key]);
		console.log("------------");
	}
	


	console.log(Object.getPrototypeOf(session));

	
	getToken((token) => {
		// --- 1) Get an OpenVidu object ---
	
	
		// OV = new OpenVidu();
		// // --- 2) Init a session ---
		// session = OV.initSession();
		// console.log(session);
		//  console.log(token);
		// --- 3) Specify the actions when events take place in the session ---

		// On every new Stream received...
		session.on('streamCreated', (event) => {
			var userName = $("#user").val();
			// Subscribe to the Stream to receive it
			// HTML video will be appended to element with 'video-container' id
			if (isSubscriber(userName)) {
				var subscriber = session.subscribe(event.stream, 'video-container');
				// if (subscriber == isPublisher) { subscriber = null };
				// When the HTML video has been appended to DOM...
				subscriber.on('videoElementCreated', (event) => {
					var ud = { userName:sessionName}; //provericemo ovo
					// Add a new HTML element for the user's name and nickname over its video
					appendUserData(event.element, ud);
					console.log("OVO VIDIS AKO SI SUBSCRIBER")
				});
			} else {
				console.log("Ne mozes da vidis stream-publisher si");
			}
		});

		// On every Stream destroyed...
		session.on('streamDestroyed', (event) => {
			// Delete the HTML element with the user's name and nickname
			removeUserData(event.stream.connection);
		});

		// --- 4) Connect to the session passing the retrieved token and some more data from
		//        the client (in this case a JSON with the nickname chosen by the user) ---


		session.connect(token)
			.then(() => {
				sessionId = window.location.hash.slice(1);
				if (!sessionId) {
					// If the user is joining to a new room
					sessionId=session.sessionId
				}
   
				// --- 5) Set page layout for active call ---
				var path = (location.pathname.slice(-1) == "/" ? location.pathname : location.pathname + "/");
				window.history.pushState("", "", path + '#' + sessionId);
				console.log("evo originalnog session id-ja  " + sessionId);
				var userName = $("#user").val();
				$('#session-title').text(sessionName);
				$('#join').hide();
				$('#session').show();


				// Here we check somehow if the user has 'PUBLISHER' role before
				// trying to publish its stream. Even if someone modified the client's code and
				// published the stream, it wouldn't work if the token sent in Session.connect
				// method is not recognized as 'PUBLIHSER' role by OpenVidu Server
				if (!isSubscriber(userName)) {
				
					// --- 6) Get your own camera stream ---

					var publisher = OV.initPublisher();
					$('#video-container').hide();
					// --- 7) Specify the actions when events take place in our publisher ---

					// When our HTML video has been added to DOM...
					publisher.on('videoElementCreated', (event) => {
						// Init the main video with ours and append our data
						var userData = {
							userName: userName
						};
						initMainVideo(event.element, userData);
						appendUserData(event.element, userData);
						$(event.element).prop('muted', true); // Mute local video
						console.log("Trenutno se snima...")
					});


					// --- 8) Publish your stream ---

					session.publish(publisher);
					sessionID = session.sessionId
					globalSessionId = sessionID;
					console.log(sessionID);
					console.log(globalSessionId);
					sendSessionFromFront();
				} else {
					console.warn('You don\'t have permissions to publish');
					sessionID = session.sessionId
					globalSessionId = sessionID;
					console.log(sessionID);
					console.log(globalSessionId);
					// Show SUBSCRIBER message in main video
				}
			})
			.catch(error => {
				console.warn('There was an error connecting to the session:', error.code, error.message);
			});
	});

	return false;
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

	httpPostRequest(
		'api-login/login',
		{ user: user, pass: pass },
		'Login WRONG',
		(response) => {
			$("#name-user").text(user);
			$("#not-logged").hide();
			$("#logged").show();
			// Random nickName and session
			console.log(response);
		}
	);
}

function showLogIn() {
	$("#not-logged").show();
	$("#logged").hide();
}

function logOut() {
	httpPostRequest(
		'api-login/logout',
		{},
		'Logout WRONG',
		(response) => {
			$("#not-logged").show();
			$("#logged").hide();
		}
	);
}

function getToken(callback) {
	//sessionName = $("#sessionName").val(); // Video-call chosen by the user
	//sessionName = "Session"; // Video-call chosen by the user
	sessionName = makeid(15);
	console.log("in getToken ", sessionId);
	httpPostRequest(
		'api-sessions/get-token',
		{ sessionName: sessionName },
		'Request of TOKEN gone WRONG:',
		(response) => {
			console.log("response ",response);
			token = response[0]; // Get token from response
			console.warn('Request of TOKEN gone WELL (TOKEN:' + token + ')');
			console.log(token);
			callback(token); // Continue the join operation
		}
	);
}

function sendSessionFromFront() {
	globalSessionId = globalSessionId; // Video-call chosen by the user
	sessionName=sessionName;
	globalOV=globalOV;
	console.log(globalSessionId);
	httpPostRequest(
		'api-sessions/sendSessionFromFront',
		{
			globalSessionId: globalSessionId,
			sessionName:sessionName,
			globalOV:globalOV
		},
		'Request gone WRONG:',
		(response) => {
			console.log("Iz send session-a " + JSON.stringify(response));
			console.log("evo session id-ja iz send session funkcije " + globalSessionId);
		}
	);
}

function removeUser() {
	httpPostRequest(
		'api-sessions/remove-user',
		{ sessionName: sessionName, token: token },
		'User couldn\'t be removed from session',
		(response) => {

			console.warn("You have been removed from session " + sessionName);
		}
	);
}

function showRecording() {
	httpGetRequest(
		`https://localhost:4443/api/recordings/${globalSessionId}`,
		{},
		'Failed to fetch recordings',
		res => {
			console.log("Ovde vidimo recording :" + JSON.stringify(res));
			globalRes = res;
			return JSON.stringify(res);
		}
	);
}

function httpPostRequest(url, body, errorMsg, callback) {
	var http = new XMLHttpRequest();
	http.open('POST', url, true);
	http.setRequestHeader('Content-type', 'application/json');
	http.addEventListener('readystatechange', processRequest, false);
	http.send(JSON.stringify(body));

	function processRequest() {
		if (http.readyState == 4) {
			if (http.status == 200) {
				try {
					callback(JSON.parse(http.responseText));
				} catch (e) {
					callback();
				}
			} else {
				console.warn(errorMsg);
				console.warn(http.responseText);
			}
		}
	}
}

function httpGetRequest(url, body, errorMsg, callback) {
	var http = new XMLHttpRequest();
	http.open('GET', url, true);
	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('Access-Control-Allow-Origin', '*');
	http.setRequestHeader("Authorization", 'Basic ' + btoa('OPENVIDUAPP:MY_SECRET'));
	http.addEventListener('readystatechange', processRequest, false);
	http.send(JSON.stringify(body));

	function processRequest() {
		if (http.readyState == 4) {
			if (http.status == 200) {
				try {
					callback(JSON.parse(http.responseText));
				} catch (e) {
					callback();
				}
			} else {
				console.warn(errorMsg);
				console.warn(http.responseText);
			}
		}
	}
}
/* APPLICATION REST METHODS */



/* APPLICATION BROWSER METHODS */

window.addEventListener('load', function () {
	sessionId = window.location.hash.slice(1); // For 'https://myurl/#roomId', sessionId would be 'roomId'
	console.log("Before Joining Session");
	// console.log("POSLE GET SESSION-NECES GA MAJCI TRALALALA IDEMO NIIIIS");
	if (sessionId) {
		// The URL has a session id. Join the room right away
		console.log("Subscribing to a session with url  " + sessionId);
		//joinSession();
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
		leaveSession();
	}
	logOut();
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
// function randomString() {
// 	return Math.random().toString(36).slice(2);
// }
function makeid(length) {
	var result = '';
	var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

//  console.log(makeid(12));
console.log("evo session id-ja pre starta " + sessionId)