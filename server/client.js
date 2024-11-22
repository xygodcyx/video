let localStream;
let peerConnection;
let pollingInterval;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');

const configuration = {
    iceServers: [{urls: 'stun:stun.l.google.com:19302'}, {urls: 'stun:stun1.l.google.com:19302'}, {urls: 'stun:stun2.l.google.com:19302'}, {urls: 'stun:stun3.l.google.com:19302'}, {urls: 'stun:stun4.l.google.com:19302'},]
};

startButton.onclick = startCall;
hangupButton.onclick = hangup;

function startCall() {
    navigator.mediaDevices.getUserMedia({video: true, audio: true})
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            createPeerConnection();
            startButton.disabled = true;
            hangupButton.disabled = false;
            startPolling();
        })
        .catch(error => console.error('Error accessing media devices:', error));
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            sendSignal({type: 'candidate', candidate: event.candidate});
        }
    };

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onnegotiationneeded = () => {
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                sendSignal({type: 'offer', offer: peerConnection.localDescription});
            })
            .catch(error => console.error('Error creating offer:', error));
    };
}

function sendSignal(data) {
    fetch('/api/signaling', {
        method: 'POST', headers: {
            'Content-Type': 'application/json',
        }, body: JSON.stringify(data),
    }).then(response => response.json())
        .then(result => console.log('Signal sent:', result))
        .catch(error => console.error('Error sending signal:', error));
}

function startPolling() {
    pollingInterval = setInterval(() => {
        fetch('/api/signaling')
            .then(response => response.json())
            .then(messages => {
                messages.forEach(handleSignalingMessage);
            })
            .catch(error => console.error('Error polling for messages:', error));
    }, 1000); // Poll every 1 second
}

function handleSignalingMessage(message) {
    switch (message.type) {
        case 'offer':
            handleOffer(message.offer);
            break;
        case 'answer':
            handleAnswer(message.answer);
            break;
        case 'candidate':
            handleCandidate(message.candidate);
            break;
    }
}

function handleOffer(offer) {
    if (!peerConnection) {
        createPeerConnection();
    }

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            sendSignal({type: 'answer', answer: peerConnection.localDescription});
        })
        .catch(error => console.error('Error handling offer:', error));
}

function handleAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .catch(error => console.error('Error handling answer:', error));
}

function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(error => console.error('Error adding ICE candidate:', error));
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
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.disabled = false;
    hangupButton.disabled = true;
}

