import { useRef, useState } from "react";
import { firestore } from "./firebaseconfig";

import "./App.css";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    deleteDoc,
    query,
    getDocs,
} from "firebase/firestore";

// Initialize WebRTC
const servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);

function App() {
    const [currentPage, setCurrentPage] = useState("home");
    const [joinCode, setJoinCode] = useState("");

    return (
        <div className="app">
            {currentPage === "home" ? (
                <Menu
                    joinCode={joinCode}
                    setJoinCode={setJoinCode}
                    setPage={setCurrentPage}
                />
            ) : (
                <Videos
                    mode={currentPage}
                    callId={joinCode}
                    setPage={setCurrentPage}
                />
            )}
        </div>
    );
}

function Menu({ joinCode, setJoinCode, setPage }) {
    return (
        <div className="home">
            <div className="create box">
                <button onClick={() => setPage("create")}>Create Call</button>
            </div>

            <div className="answer box">
                <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Join with code"
                />
                <button onClick={() => setPage("join")}>Answer</button>
            </div>
        </div>
    );
}

function Videos({ mode, callId, setPage }) {
    const [webcamActive, setWebcamActive] = useState(false);
    const [roomId, setRoomId] = useState(callId);

    const localRef = useRef();
    const remoteRef = useRef();

    const setupSources = async () => {
        const localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        const remoteStream = new MediaStream();

        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream.addTrack(track);
            });
        };

        localRef.current.srcObject = localStream;
        remoteRef.current.srcObject = remoteStream;

        setWebcamActive(true);

        if (mode === "create") {
            const callDoc = doc(collection(firestore, "calls"));
            const offerCandidates = collection(callDoc, "offerCandidates");
            const answerCandidates = collection(callDoc, "answerCandidates");

            setRoomId(callDoc.id);

            pc.onicecandidate = (event) => {
                event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
            };

            const offerDescription = await pc.createOffer();
            await pc.setLocalDescription(offerDescription);

            const offer = {
                sdp: offerDescription.sdp,
                type: offerDescription.type,
            };

            await setDoc(callDoc, { offer });

            onSnapshot(callDoc, (snapshot) => {
                const data = snapshot.data();
                if (!pc.currentRemoteDescription && data?.answer) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    pc.setRemoteDescription(answerDescription);
                }
            });

            onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });
        } else if (mode === "join") {
            const callDoc = doc(firestore, "calls", callId);
            const answerCandidates = collection(callDoc, "answerCandidates");
            const offerCandidates = collection(callDoc, "offerCandidates");

            pc.onicecandidate = (event) => {
                event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
            };

            const callData = (await getDoc(callDoc)).data();

            const offerDescription = callData.offer;
            await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            const answer = {
                type: answerDescription.type,
                sdp: answerDescription.sdp,
            };

            await updateDoc(callDoc, { answer });

            onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        let data = change.doc.data();
                        pc.addIceCandidate(new RTCIceCandidate(data));
                    }
                });
            });
        }

        pc.onconnectionstatechange = (event) => {
            if (pc.connectionState === "disconnected") {
                hangUp();
            }
        };
    };

    const hangUp = async () => {
        pc.close();

        if (roomId) {
            let roomRef = doc(firestore, "calls", roomId);
            const answerCandidates = collection(roomRef, "answerCandidates");
            const offerCandidates = collection(roomRef, "offerCandidates");

            const answerSnapshots = await getDocs(answerCandidates);
            answerSnapshots.forEach((doc) => {
                deleteDoc(doc.ref);
            });

            const offerSnapshots = await getDocs(offerCandidates);
            offerSnapshots.forEach((doc) => {
                deleteDoc(doc.ref);
            });

            await deleteDoc(roomRef);
        }

        window.location.reload();
    };

    return (
        <div className="videos">
            <video ref={localRef} autoPlay playsInline className="local" muted />
            <video ref={remoteRef} autoPlay playsInline className="remote" />

            <div className="buttonsContainer">
                <button onClick={hangUp} disabled={!webcamActive} className="hangup button">
                    Hang Up
                </button>
                <div tabIndex={0} role="button" className="more button">
                    <div className="popover">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(roomId);
                            }}
                        >
                            Copy joining code
                        </button>
                    </div>
                </div>
            </div>

            {!webcamActive && (
                <div className="modalContainer">
                    <div className="modal">
                        <h3>
                            Turn on your camera and microphone and start the call
                        </h3>
                        <div className="container">
                            <button onClick={() => setPage("home")} className="secondary">
                                Cancel
                            </button>
                            <button onClick={setupSources}>Start</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


export default App;
