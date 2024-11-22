let localStream;
let peerConnection;
let ws;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');

const configuration = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};

startButton.onclick = startCall;
hangupButton.onclick = hangup;

function startCall() {
    ws = new WebSocket(`ws://${window.location.host}`);
    ws.onmessage = handleSignalingMessage;

    navigator.mediaDevices.getUserMedia({video: true, audio: true})
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            createPeerConnection();
            startButton.disabled = true;
            hangupButton.disabled = false;
        })
        .catch(error => console.error('Error accessing media devices:', error));
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            ws.send(JSON.stringify({type: 'candidate', candidate: event.candidate}));
        }
    };

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            ws.send(JSON.stringify({type: 'offer', offer: peerConnection.localDescription}));
        });
}

function handleSignalingMessage(event) {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'offer':
            handleOffer(message.offer);
            break;
        case 'answer':
            peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
            break;
        case 'candidate':
            peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            break;
    }
}

function handleOffer(offer) {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            ws.send(JSON.stringify({type: 'candidate', candidate: event.candidate}));
        }
    };

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            ws.send(JSON.stringify({type: 'answer', answer: peerConnection.localDescription}));
        });
}

function hangup() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    ws.close();
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.disabled = false;
    hangupButton.disabled = true;
}