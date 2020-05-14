/* CONFIGURATION */ 
var OpenVidu = require('openvidu-node-client').OpenVidu;
var Session = require('openvidu-node-client').Session;
var OpenViduRole = require('openvidu-node-client').OpenViduRole;

// Check launch arguments: must receive openvidu-server URL and the secret
if (process.argv.length != 4) {
    console.log("Usage: node " + __filename + " OPENVIDU_URL OPENVIDU_SECRET");
    process.exit(-1);
}
// For demo purposes we ignore self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Node imports
var express = require('express');
var app = express(); // Create our app with express
var cors = require('cors');
var kafka = require('kafka-node');
const path = require('path');
var axios = require("axios");
var rp = require("request-promise");
var fs = require('fs');
var btoa = require('btoa');
var session = require('express-session');
var https = require('https');
var bodyParser = require('body-parser'); // Pull information from HTML POST (express4)
var RtspServer = require('rtsp-streaming-server').default;
const rtspserver = new RtspServer({
    serverPort: 5554,
    clientPort: 6554,
    rtpPortStart: 10000,
    rtpPortCount: 10000
});

const NodeMediaServer = require('node-media-server');
const nmsConfig = {
    rtmp: {
      port: 8002,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60
    },
    http: {
      port: 8080,
      allow_origin: '*'
    }
    
  };
var nms = new NodeMediaServer(nmsConfig);

var ffmpeg = require('fluent-ffmpeg');
var command = ffmpeg();

var {
    promisify
} = require('util');
var getIP = promisify(require('external-ip')());
var sessionId;
var fullUrl;
var gStreamPath;
var gStreamId;

// Server configuration
app.use(session({
    saveUninitialized: true,
    resave: false,
    secret: 'MY_SECRET'
}));
app.use(express.static(__dirname + '/public')); // Set the static files location
app.use(bodyParser.urlencoded({
    'extended': 'true'
})); // Parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // Parse application/json
app.use(bodyParser.json({
    type: 'application/vnd.api+json'
}));
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
})); // Parse application/vnd.api+json as json
app.use(cors());
// Listen (start app with node server.js)
var options = {
    key: fs.readFileSync('openvidukey.pem'),
    cert: fs.readFileSync('openviducert.pem')
};

var server = https.createServer(options, app).listen(5000, function () {
    console.log('App running at 5000');
});

// Environment variable: URL where our OpenVidu server is listening
var OPENVIDU_URL = process.argv[2];
// Environment variable: secret shared with our OpenVidu server
var OPENVIDU_SECRET = process.argv[3];

// Entrypoint to OpenVidu Node Client SDK
var OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

var properties = {
    recordingMode: "ALWAYS", //RecordingMode.ALWAYS, // RecordingMode.ALWAYS for automatic recording
    defaultOutputMode: "INDIVIDUAL" //Recording.OutputMode.INDIVIDUAL
};
// Collection to pair session names with OpenVidu Session objects
var mapSessionObject = {};
// Collection to pair session names with tokens
var mapSessionObjectToken = {};

/* CONFIGURATION */

// Mock database
var users = [
    {
        userId: "marko",
        user: "publisher1",
        pass: "pass", 
        ip:"::ffff:87.116.181.210",//MODIFY
        role: OpenViduRole.PUBLISHER
    },
    {
        userId: "silvio",
        user: "publisher4",
        pass: "pass",
        ip: "::ffff:93.62.63.197",
        role: OpenViduRole.PUBLISHER
    },
    {
        user: "subscriber1",
        pass: "pass",
        role: OpenViduRole.SUBSCRIBER
    }
];



//KAFKA METHODS
        
var Producer = kafka.Producer,
    //client = new kafka.KafkaClient(),
    client = new kafka.KafkaClient({
   //    kafkaHost: "217.172.12.192:9092"
    kafkaHost: "35.178.85.208:9094" 
      
    }),
    producer = new Producer(client);

var Consumer = kafka.Consumer,
    consumer = new Consumer(
        client,
        [{
            topic: 'TOP401_IOT_PROPAGATE_EVENT',
            offset: 0
        }], {
            autoCommit: false
        
        }
    );


producer.on('error', function (err) {
    console.log('Producer is in error state');
    console.log(err);
});

consumer.on('message', function (message) {
    // console.log(message);
    //will come back
});

consumer.on('error', function (err) {
    console.log('Error:', err);
});

consumer.on('offsetOutOfRange', function (err) {
    // console.log('offsetOutOfRange:', err); will come back
});


//WE don't need this for now, but we will need it sometime when we create a new topic

// var topicsToCreate = [{
//     topic: 'TOP_VIDEO_STREAMS',
//     partitions: 1,
//     replicationFactor: 1
// }];

// client.createTopics(topicsToCreate, (error, result) => {
//     if (error) {
//         console.log(error);
//     }
//     console.log(result);
//     // result is an array of any errors if a given topic could not be created
// });

//RTSP SERVER IMPLEMENTATION

async function rtsprun() {
    try {
        await rtspserver.start();
        console.log("Rtsp server is running");
    } catch (e) {
        console.error(e);
    }
}

//rtsprun();


//NODE MEDIA SERVER METHODS

nms.run();
nms.on('preConnect', (id, args) => {
    console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('postConnect', (id, args) => {
    console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
    console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
    
});

nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  //   ffmpegConversion();
     sendRtmptoRtspKafka(StreamPath);
});

nms.on('postPublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('prePlay', (id, StreamPath, args) => {
    console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });

nms.on('postPlay', (id, StreamPath, args) => {
    console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

});

nms.on('donePlay', (id, StreamPath, args) => {
    console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});


app.get('/api-sessions/fetchip', function (req, res) {

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("Below is the ip");
    console.log(ip);
    res.send({ 
        ip
    });
});




//FFMPEG METHODS 


//MODIFY
function ffmpegConversion(){
 var two=ffmpeg('rtmp://127.0.0.1:8002/app/live', {
        timeout: 432000
    })
    .videoCodec('libx264')
    .format("rtsp")
    .fps(10)
    .size('50%')
    .keepDAR()
    //.audioBitrate('128k')
   // .videoBitrate("500")
    .on('start', function(commandLine) {
     console.log("Start has been triggered " + commandLine);
      })
    .on("progress", function (progress) {
        console.log('1.Frames: ' +progress.frames);
        console.log('2.Current Fps: ' +progress.currentFps);
        console.log('3.Current kbps: ' +progress.currentKbps);
        console.log('4.Target size: ' +progress.targetSize);
        console.log('5.Percent: ' +progress.percent);
        console.log('6.Timemark: ' + progress.timemark + ' sec');
    })
    .on('codecData', function(data) {
        console.log('On codec data');
        sendRtmptoRtspKafka();
      })
    .on('end', function () {
        console.log('file has ended converting succesfully');
    })
    .on('error', function (err) {
        console.log('an error happened: ' + err.message);
    })
    .save('rtsp://127.0.0.1:8554/mystream');
}
//MODIFY

 function sendFetchedSession() {
    var options = {

        url: `https://${OPENVIDU_URL}/api/sessions/${sessionId}`,

        method: "GET",

        resolveWithFullResponse: true,

        headers: {
            "Access-Control-Allow-Origin": "*",
            "Authorization": "Basic " + btoa("OPENVIDUAPP:MY_SECRET")
        }

    };

    getIP()
        .then((ip) => {
            console.log("This is external ip " + ip);
            fullUrl = `https://${ip}:${server.address().port}/`;
            console.log(fullUrl);
            return rp(options);
        })
        .then(response => {
            bodyObject = JSON.parse(response.body);
            console.log("Body object original " + response.body);

            //  Making new object!!!   and send bodyObject1

            var bodyObject1 = {
                deviceId:roomId,
                deviceType: "Body worn camera", //UBACITI
                sessionId: `${bodyObject.sessionId}`,

                // streamPath: `public/recordings/${bodyObject.sessionId}`,
                streamUrl: `${fullUrl}${bodyObject.connections.content[0].publishers[0].streamId}`,
     //           localStreamUrl: `https://localhost:5000/${bodyObject.connections.content[0].publishers[0].streamId}`,
                htmlUrl: `${fullUrl}#${bodyObject.sessionId}`,
                // connectionId: bodyObject.connections.content[0].connectionId,
                // createdAt: bodyObject.connections.content[0].createdAt,
                // location: bodyObject.connections.content[0].location,
                platform: bodyObject.connections.content[0].platform
                // token: bodyObject.connections.content[0].token,

            };
            // console.log(Object.keys(bodyObject.connections.content[0]));
            bodyString = JSON.stringify(bodyObject1);
            gStreamPath=bodyObject1.streamUrl;
            gStreamId=`${bodyObject.connections.content[0].publishers[0].streamId}`;
            console.log("GLOBALNI PATH DO STREAMA   "+gStreamPath);
            console.log("GLOBALNI ID STREAMA   "+gStreamId);
            console.log("Body string for kafka  : " + bodyString);
            console.log("Body object  : " + bodyObject1);
            var fullMessage={
                "header": {
                    "topicName": "TOP401_IOT_PROPAGATE_EVENT",
                    "topicVer1":  1,
                    "topicVer2":  0,
                    "msgId":      "IOT-000001",
                    "sender":     "IOT",
                    "sentUtc":    "2020-01-27T14:05:00Z",
                    "status":     "Test",
                    "msgType":    "Update",
                    "source":     "VMS",
                    "scope":      "Restricted",
                    "caseId":     "0"
                },
                "body": bodyObject1
            };
            console.log("Full message "+JSON.stringify(fullMessage));
            var fullStringMessage=JSON.stringify(fullMessage);
            payloads = [{
                topic: "TOP401_IOT_PROPAGATE_EVENT", //TREBALO BI PROMENITI u TOP401_IOT_PROPAGATE_EVENT
                messages:fullStringMessage,
                partition: 0,
                timestamp: Date.now()
            }];
            producer.send(payloads, function (err, data) {
                if (err) {
                    console.log(err);
                }
                console.log("Kafka data " + JSON.stringify(data)); //will come back
                console.log("Done");
            });

            // return postFiware(bodyObject1);
        })
        .then((value => {
            // console.log("postfiware executed, status code " + value.statusCode);
        }))
        .catch(error => {
            console.log("Error has been catched  " +error);
        });

}



app.post('/api-sendRtspKafka', function (req, res) {  //UBACITI
    let reqBody;
    let fullMessage1;
    let fullStringMessage1;
    console.log(req.body);
    reqBody = {
        deviceId: req.body.deviceId,
        deviceType: "IP camera",
        streamUrl: req.body.streamUrl
    };
    fullMessage1 = {
        "header": {
            "topicName": "TOP401_IOT_PROPAGATE_EVENT",
            "topicVer1": 1,
            "topicVer2": 0,
            "msgId": "IOT-000001",
            "sender": "IOT",
            "sentUtc": "2020-01-27T14:05:00Z",
            "status": "Test",
            "msgType": "Update",
            "source": "VMS",
            "scope": "Restricted",
            "caseId": "0"
        },
        "body": reqBody
    };
    console.log("Full message " + JSON.stringify(fullMessage1));
    fullStringMessage1 = JSON.stringify(fullMessage1);
    payloads = [{
        topic: "TOP401_IOT_PROPAGATE_EVENT", //TREBALO BI PROMENITI u TOP401_IOT_PROPAGATE_EVENT
        messages: fullStringMessage1,
        partition: 0,
        timestamp: Date.now()
    }];
    producer.send(payloads, function (err, data) {
        if (err) {
            console.log(err);
        }
        console.log("Kafka data " + JSON.stringify(data)); //will come back
        console.log("Done");
    });

    res.status(200).send("Message to Kafka sent");
});






function postFiware(bodyObject1) {
    return new Promise((resolve, reject) => {
        console.log("IN postfiware bodyobject " + JSON.stringify(bodyObject1));
        var options = {
            method: "POST",
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Authorization": "Basic " + btoa("OPENVIDUAPP:MY_SECRET"),
                "options": "keyValues"
            },
            uri: "http://localhost:1026/v2/entities?options=keyValues", //217.172.12.192
            resolveWithFullResponse: true,
            json: true,
            body: {
                id: bodyObject1.connectionId,
                type: "Stream",
                sessionId: bodyObject1.sessionId,
                createdAt: bodyObject1.createdAt,
                location: bodyObject1.location,
                platform: bodyObject1.platform
            }
        };

        rp(options)
            .then((response) => {
                // console.log("RESPONSE IZ FIWAREA " + JSON.stringify(response.body));
                console.log("before resolving postFiware");
                console.log(response.statusCode);
                return resolve(response);
            })
            .catch(error => {
                console.log(error.statusCode);
                return reject(error);
            });

    });
}

app.post('/api-sessions/sendSessionFromFront', function (req, res) {

    // Retrieve params from POST body
    sessionId = req.body.sessionId;
    roomId=req.body.roomId;
    console.log("Evo nam ga originalni session id  " + sessionId);
    console.log("Evo nam ga originalni room id  " + roomId);
    res.status(200).send({
        sessionId: sessionId,
        message: "Evo odgovora iz backend-a sa session id-jem"
    });
    // sendFetchedSession();
});

app.get('/api-sessions/sendFetchedSession', function (req, res) {

    // Retrieve params from POST body

    res.status(200).send(
        sendFetchedSession()
        );
    

});


// Login
app.post('/api-login/login', function (req, res) {

    // Retrieve params from POST body
    var user = req.body.user;
    var pass = req.body.pass;
    var userId = req.body.userId;
    var gUserId=userId;
    var ip = req.body.ip;
    var role;
    console.log("{Logging in with  username, password ,ip}={" + user + " ," + pass + " ," + ip + "}");

    if (verifySubscriber(ip)) { // Correct user-pass
        role = OpenViduRole.SUBSCRIBER;
        // Validate session and return OK 
        // Value stored in req.session allows us to identify the user in future requests
        console.log(user + " has logged in" + pass + " , " + role);
        req.session.loggedUser = user;
        // role=req.session.loggedUser.role;
        res.status(200).send({
            user: user,
            message: "You have logged in successfully",
            role: role,
            pass: pass
        });
        // res.send();
    } else {
        //THIS IS REPLACED 
        // Wrong user-pass
        // Invalidate session and return error
        // console.log("'" + user + "' invalid credentials");
        // req.session.destroy();
        // res.status(401).send('User/Pass incorrect');  
        if (verifyPublisher(userId)) {
            res.status(200).send({
                user: user,
                message: "You are streaming successfully",
                userId: userId,
                ip: undefined
            });
            console.log(`this is role  ${role}`);
            console.log("this is logged ip " + ip);
        } else {
            res.status(400).send({
                message: "You are not authorized to publish"
            });
        }
     }
});

//Logout

// app.post('/api-login/logout', function (req, res) {
//     console.log("'" + req.session.loggedUser + "' has logged out");
//     req.session.destroy();
//     res.status(200).send();
// });  

// Get token (add new user to session)

app.post('/api-sessions/create-session', function (req, res) {


    var resSession = OV.createSession(properties);
    resSession.then((res) => {
        Session.getSessionId;
    });
    res.status(200).send(resSession);
});


//Function for retrieving a token from OV

// app.post('/api-sessions/get-token', function (req, res) {


//     // The video-call to connect
//     var roomId = req.body.roomId;
//     // Role associated to this user
//     var role;
//     if (role) {
//         role = users.find(u => (u.user === req.session.loggedUser)).role;
//     } else {
//         role = OpenViduRole.PUBLISHER;
//     }

//     // Optional data to be passed to other users when this user connects to the video-call
//     // In this case, a JSON with the value we stored in the req.session object on login
//     // var serverData = JSON.stringify({ serverData: req.session.loggedUser }); vraticemo

//     console.log("Getting a token | {roomId}={" + roomId + "}");
//     // Build tokenOptions object with the serverData and the role
//     var tokenOptions = {
//         // data: serverData,
//         role: role
//     };

//     if (mapSessionObject[roomId]) {
//         // Session already exists
//         console.log('Existing room ' + roomId);

//         // Get the existing Session from the collection
//         var mySession = mapSessionObject[roomId];
//         // console.log("Here is mySession "+util.inspect( mySession));
//         // Generate a new token asynchronously with the recently created tokenOptions
//         mySession.generateToken(tokenOptions)
//             .then(token => {

//                 // Store the new token in the collection of tokens
//                 mapSessionObjectToken[roomId].push(token);

//                 // Return the token to the client
//                 res.status(200).send({
//                     0: token
//                 });
//             })
//             .catch(error => {
//                 console.error(error);
//             });
//     } else {
//         // New session
//         console.log('New session ' + roomId);

//         // Create a new OpenVidu Session asynchronously
//         OV.createSession(properties)
//             .then(session => {
//                 // Store the new Session in the collection of Sessions
//                 mapSessionObject[roomId] = session;
//                 // Store a new empty array in the collection of tokens
//                 mapSessionObjectToken[roomId] = [];
//                 // console.log(util.inspect( session))
//                 // Generate a new token asynchronously with the recently created tokenOptions
//                 session.generateToken(tokenOptions)
//                     .then(token => {

//                         // Store the new token in the collection of tokens
//                         mapSessionObjectToken[roomId].push(token);

//                         // Return the Token to the client
//                         res.status(200).send({
//                             0: token
//                         });
//                     })
//                     .catch(error => {
//                         console.error(error);
//                     });
//             })
//             .catch(error => {
//                 console.error(error);
//             });
//     }

// });

// Remove user from session
app.post('/api-sessions/remove-user', function (req, res) {

    // Retrieve params from POST body
    var roomId = req.body.roomId;
    var token = req.body.token;
    console.log('Removing user with {roomId, token}={' + roomId + ', ' + token + '}');

    // If the session exists
    if (mapSessionObject[roomId] && mapSessionObjectToken[roomId]) {
        var tokens = mapSessionObjectToken[roomId];
        var index = tokens.indexOf(token);

        // If the token exists
        if (index !== -1) {
            // Token removed

            tokens.splice(index, 1);

            console.log(roomId + ': ' + tokens.toString());
        } else {
            var msg = 'Problems in the app server: the TOKEN wasn\'t valid';
            console.log(msg);
            res.status(500).send(msg);
        }
        if (tokens.length == 0) {
            // Last user left: session must be removed
            console.log("Room with id " + roomId + ' empty!');
            delete mapSessionObject[roomId];
        }
        res.status(200).send();
    } else {
        var msg = 'SESSION does not exist- no users there';
        console.log(msg);
        res.status(500).send(msg);
    }

});

/* REST API */



/* AUXILIARY METHODS */

function verifySubscriber(ip) {
    return (users.find(u => (u.ip === ip)));
}

function verifyPublisher(userId) {
    // return (users.find(u => (u.userId === userId) && (u.ip === ip)));
    return (users.find(u => (u.userId === userId)&&(userId!=undefined)));
}



function sendRtmptoRtspKafka(StreamPath) {
    let appServerAddress=process.argv[2].split(":")[0];
    let fullMessage2;
    let fullStringMessage2;
    let fullBodyMessage=
            {
                deviceId: `cam-3`,
     //cam-3            
                sessionId: ``,
             //   streamUrl: `rtmp://217.172.12.192:8002`+StreamPath,
                streamUrl: `rtmp://${appServerAddress}:8002`+StreamPath,
                
                htmlUrl: ``,

                platform: ``

            };
    fullMessage2 = {
        "header": {
            "topicName": "TOP401_IOT_PROPAGATE_EVENT",
            "topicVer1": 1,
            "topicVer2": 0,
            "msgId": "IOT-000001",
            "sender": "IOT",
            "sentUtc": "2020-01-27T14:05:00Z",
            "status": "Test",
            "msgType": "Update",
            "source": "VMS",
            "scope": "Restricted",
            "caseId": "0"
        },
       // "body": "rtsp://217.172.12.192:8554/mystream" 
        "body":fullBodyMessage
    };
    console.log("Full message " + JSON.stringify(fullMessage2));
    fullStringMessage2 = JSON.stringify(fullMessage2);
    payloads = [{
        topic: "TOP401_IOT_PROPAGATE_EVENT", 
        messages: fullStringMessage2,
        partition: 0,
        timestamp: Date.now()
    }];
    producer.send(payloads, function (err, data) {
        if (err) {
            console.log(err);
        }
        console.log("Kafka data " + JSON.stringify(data));
        console.log("Kafka Done");
    });
}
