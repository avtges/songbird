<<<<<<< HEAD
//our username 
var name; 
var connectedUser;
 
//connecting to our signaling server 
var conn = new WebSocket('ws://10.0.0.134:8888');
 
conn.onopen = function () { 
   console.log("Connected to the signaling server"); 
};
 
//when we got a message from a signaling server 
conn.onmessage = function (msg) { 
   console.log("Got message", msg.data); 
   var data = JSON.parse(msg.data); 
	
   switch(data.type) { 
      case "login": 
         handleLogin(data.success); 
         break; 
      //when somebody wants to call us 
      case "offer": 
         handleOffer(data.offer, data.name); 
         break; 
      case "answer": 
         handleAnswer(data.answer); 
         break; 
      //when a remote peer sends an ice candidate to us 
      case "candidate": 
         handleCandidate(data.candidate); 
         break; 
      case "leave": 
         handleLeave(); 
         break; 
      default: 
         break; 
   } 
}; 

conn.onerror = function (err) { 
   console.log("Got error", err); 
};
 
//alias for sending JSON encoded messages 
function send(message) { 
   //attach the other peer username to our messages 
   if (connectedUser) { 
      message.name = connectedUser; 
   } 
	
   conn.send(JSON.stringify(message)); 
};
 
//****** 
//UI selectors block 
//****** 

var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 
var hangUpBtn = document.querySelector('#hangUpBtn'); 

var recordBtn = document.querySelector('#record'); 
var stopBtn = document.querySelector('#stop'); 


var localAudio = document.querySelector('#localAudio'); 
var remoteAudio = document.querySelector('#remoteAudio'); 

var yourConn; 
var stream; 

var audio_context;
var recorder;

callPage.style.display = "none";
 
// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value; 
	
   if (name.length > 0) { 
      send({ 
         type: "login", 
         name: name 
      }); 
   } 
	
});
 
function hasUserMedia() { 
      //check if the browser supports the WebRTC 
      return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || 
            navigator.mozGetUserMedia); 
} 

function startUserMedia(stream) {
      var input = audio_context.createMediaStreamSource(stream);

      // Uncomment if you want the audio to feedback directly
      //input.connect(audio_context.destination);
      //__log('Input connected to audio context destination.');
      
      recorder = new Recorder(input);
}

function handleLogin(success) { 
   if (success === false) { 
      alert("Ooops...try a different username"); 
   } else { 

      if (hasUserMedia()) { 
         navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia; 
         window.AudioContext = window.AudioContext || window.webkitAudioContext;
         audio_context = new AudioContext;
         
         loginPage.style.display = "none"; 
         callPage.style.display = "block"; 
         
         
         //********************** 
         //Starting a peer connection 
         //**********************    
         
         //getting local audio stream 
         navigator.getUserMedia({ video: false, audio: true }, function (arg) { 
            stream = arg; 
            
            startUserMedia(stream);

            //displaying local audio stream on the page 
            localAudio.src = window.URL.createObjectURL(stream);
                        
            //using Google public stun server 
            var configuration = { 
                  "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }] 
            }; 
                        
            yourConn = new RTCPeerConnection(configuration); 
                        
            // setup stream listening 
            yourConn.addStream(stream); 
                        
            yourConn.onstream = function (e) { 
                  
                  // e.type == 'remote' || 'local' 
                  yourConn.streams[e.streamid].startRecording({ 
                        audio: true,
                        video: false 
                  }); 
            
                  // record 10 sec audio/video 
                  var recordingInterval = 10 * 10000; 
            
                  setTimeout(function () { 
                        connection.streams[e.streamid].stopRecording(function (blob) { 
                              var mediaElement = document.createElement('audio'); 
                              mediaElement.src = URL.createObjectURL(blob.audio); 
                              document.documentElement.appendChild(h2); 
                        }); 
                  }, recordingInterval) 
            };


            //when a remote user adds stream to the peer connection, we display it 
            yourConn.onaddstream = function (e) { 
                  remoteAudio.src = window.URL.createObjectURL(e.stream); 
            }; 
                        
            // Setup ice handling 
            yourConn.onicecandidate = function (event) { 
                  if (event.candidate) { 
                        send({ 
                              type: "candidate", 
                              candidate: event.candidate 
                        }); 
                  } 
            }; 
         }, function (error) { console.log(error); }); 
      } else { 
            alert("WebRTC is not supported"); 
            return;
      }
   }
}
 
//initiating a call 
callBtn.addEventListener("click", function () { 
   var callToUsername = callToUsernameInput.value; 
   
   if (callToUsername.length > 0) { 
      connectedUser = callToUsername; 
		
      // create an offer 
      yourConn.createOffer(function (offer) { 
         send({
            type: "offer", 
            offer: offer 
         }); 
			
         yourConn.setLocalDescription(offer); 
      }, function (error) { 
         alert("Error when creating an offer"); 
      }); 
   } 
});
 
//when somebody sends us an offer 
function handleOffer(offer, name) { 
   connectedUser = name; 
   yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
	
   //create an answer to an offer 
   yourConn.createAnswer(function (answer) { 
      yourConn.setLocalDescription(answer); 
		
      send({ 
         type: "answer", 
         answer: answer 
      });
		
   }, function (error) { 
      alert("Error when creating an answer"); 
   }); 
	
};
 
//when we got an answer from a remote user 
function handleAnswer(answer) { 
   yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
 
//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
   yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};
 
//hang up
hangUpBtn.addEventListener("click", function () { 
   send({ 
      type: "leave" 
   }); 
	
   handleLeave(); 
});
 

//Record
recordBtn.addEventListener("click", function () { 
      send({ 
         type: "Record" 
      }); 
      
      recorder && recorder.record();
      recordBtn.disabled  = true;
      recordBtn.nextElementSibling.disabled = false;
   });

   //Record
stopBtn.addEventListener("click", function () { 
      send({ 
         type: "Stop" 
      }); 
      
      recorder && recorder.stop();
      stopBtn.disabled  = true;
      stopBtn.previousElementSibling.disabled = false;

      send

      createDownloadLink();
     
      recorder.clear();
   });

function createDownloadLink() {
      recorder && recorder.exportWAV(function(blob) {
            var url = URL.createObjectURL(blob);
            var div = document.createElement('div');
            var au = document.createElement('audio');
            var hf = document.createElement('a');
            
            au.controls = true;
            au.src = url;
            hf.href = url;
            hf.download = new Date().toISOString() + '.wav';
            hf.innerHTML = hf.download;
            div.appendChild(au);
            div.appendChild(hf);
            recordingslist.appendChild(div);

      });
}
   
function handleLeave() { 
   connectedUser = null; 
   remoteAudio.src = null; 
	
   yourConn.close(); 
   yourConn.onicecandidate = null; 
   yourConn.onaddstream = null; 
};
=======
//our username 
var name; 
var connectedUser;
 
//connecting to our signaling server 
var conn = new WebSocket('8888');
 
conn.onopen = function () { 
   console.log("Connected to the signaling server"); 
};
 
//when we got a message from a signaling server 
conn.onmessage = function (msg) { 
   console.log("Got message", msg.data); 
   var data = JSON.parse(msg.data); 
	
   switch(data.type) { 
      case "login": 
         handleLogin(data.success); 
         break; 
      //when somebody wants to call us 
      case "offer": 
         handleOffer(data.offer, data.name); 
         break; 
      case "answer": 
         handleAnswer(data.answer); 
         break; 
      //when a remote peer sends an ice candidate to us 
      case "candidate": 
         handleCandidate(data.candidate); 
         break; 
      case "leave": 
         handleLeave(); 
         break; 
      default: 
         break; 
   } 
}; 

conn.onerror = function (err) { 
   console.log("Got error", err); 
};
 
//alias for sending JSON encoded messages 
function send(message) { 
   //attach the other peer username to our messages 
   if (connectedUser) { 
      message.name = connectedUser; 
   } 
	
   conn.send(JSON.stringify(message)); 
};
 
//****** 
//UI selectors block 
//****** 

var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 
var hangUpBtn = document.querySelector('#hangUpBtn'); 

var recordBtn = document.querySelector('#record'); 
var stopBtn = document.querySelector('#stop'); 


var localAudio = document.querySelector('#localAudio'); 
var remoteAudio = document.querySelector('#remoteAudio'); 

var yourConn; 
var stream; 

var audio_context;
var recorder;

callPage.style.display = "none";
 
// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value; 
	
   if (name.length > 0) { 
      send({ 
         type: "login", 
         name: name 
      }); 
   } 
	
});
 
function hasUserMedia() { 
      //check if the browser supports the WebRTC 
      return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || 
            navigator.mozGetUserMedia); 
} 

function startUserMedia(stream) {
      var input = audio_context.createMediaStreamSource(stream);

      // Uncomment if you want the audio to feedback directly
      //input.connect(audio_context.destination);
      //__log('Input connected to audio context destination.');
      
      recorder = new Recorder(input);
}

function handleLogin(success) { 
   if (success === false) { 
      alert("Ooops...try a different username"); 
   } else { 

      if (hasUserMedia()) { 
         navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia; 
         window.AudioContext = window.AudioContext || window.webkitAudioContext;
         audio_context = new AudioContext;
         
         loginPage.style.display = "none"; 
         callPage.style.display = "block"; 
         
         
         //********************** 
         //Starting a peer connection 
         //**********************    
         
         //getting local audio stream 
         navigator.getUserMedia({ video: false, audio: true }, startUserMedia, function (arg) { 
            stream = arg; 
            
            //displaying local audio stream on the page 
            localAudio.src = window.URL.createObjectURL(stream);
                        
            //using Google public stun server 
            var configuration = { 
                  "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }] 
            }; 
                        
            yourConn = new RTCPeerConnection(configuration); 
                        
            // setup stream listening 
            yourConn.addStream(stream); 
                        
            yourConn.onstream = function (e) { 
                  
                  // e.type == 'remote' || 'local' 
                  yourConn.streams[e.streamid].startRecording({ 
                        audio: true,
                        video: false 
                  }); 
            
                  // record 10 sec audio/video 
                  var recordingInterval = 10 * 10000; 
            
                  setTimeout(function () { 
                        connection.streams[e.streamid].stopRecording(function (blob) { 
                              var mediaElement = document.createElement('audio'); 
                              mediaElement.src = URL.createObjectURL(blob.audio); 
                              document.documentElement.appendChild(h2); 
                        }); 
                  }, recordingInterval) 
            };


            //when a remote user adds stream to the peer connection, we display it 
            yourConn.onaddstream = function (e) { 
                  remoteAudio.src = window.URL.createObjectURL(e.stream); 
            }; 
                        
            // Setup ice handling 
            yourConn.onicecandidate = function (event) { 
                  if (event.candidate) { 
                        send({ 
                              type: "candidate", 
                              candidate: event.candidate 
                        }); 
                  } 
            }; 
         }, function (error) { console.log(error); }); 
      } else { 
            alert("WebRTC is not supported"); 
            return;
      }
   }
}
 
//initiating a call 
callBtn.addEventListener("click", function () { 
   var callToUsername = callToUsernameInput.value; 
   
   if (callToUsername.length > 0) { 
      connectedUser = callToUsername; 
		
      // create an offer 
      yourConn.createOffer(function (offer) { 
         send({
            type: "offer", 
            offer: offer 
         }); 
			
         yourConn.setLocalDescription(offer); 
      }, function (error) { 
         alert("Error when creating an offer"); 
      }); 
   } 
});
 
//when somebody sends us an offer 
function handleOffer(offer, name) { 
   connectedUser = name; 
   yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
	
   //create an answer to an offer 
   yourConn.createAnswer(function (answer) { 
      yourConn.setLocalDescription(answer); 
		
      send({ 
         type: "answer", 
         answer: answer 
      });
		
   }, function (error) { 
      alert("Error when creating an answer"); 
   }); 
	
};
 
//when we got an answer from a remote user 
function handleAnswer(answer) { 
   yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
 
//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
   yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};
 
//hang up
hangUpBtn.addEventListener("click", function () { 
   send({ 
      type: "leave" 
   }); 
	
   handleLeave(); 
});
 

//Record
recordBtn.addEventListener("click", function () { 
      send({ 
         type: "Record" 
      }); 
      
      recorder && recorder.record();
      recordBtn.disabled  = true;
      recordBtn.nextElementSibling.disabled = false;
   });

   //Record
stopBtn.addEventListener("click", function () { 
      send({ 
         type: "Stop" 
      }); 
      
      recorder && recorder.stop();
      stopBtn.disabled  = true;
      stopBtn.previousElementSibling.disabled = false;

      send

      createDownloadLink();
     
      recorder.clear();
   });

function createDownloadLink() {
      recorder && recorder.exportWAV(function(blob) {
            var url = URL.createObjectURL(blob);
            var div = document.createElement('div');
            var au = document.createElement('audio');
            var hf = document.createElement('a');
            
            au.controls = true;
            au.src = url;
            hf.href = url;
            hf.download = new Date().toISOString() + '.wav';
            hf.innerHTML = hf.download;
            div.appendChild(au);
            div.appendChild(hf);
            recordingslist.appendChild(div);

      });
}
   
function handleLeave() { 
   connectedUser = null; 
   remoteAudio.src = null; 
	
   yourConn.close(); 
   yourConn.onicecandidate = null; 
   yourConn.onaddstream = null; 
};
>>>>>>> remotes/origin/master
