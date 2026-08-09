import React, { useEffect, useRef, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function MultiplayerDebateScreen({
  roomId,
  playerName,
  topic,
  opponentName,
  onDebateFinished,
})  {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const offerCreatedRef = useRef(false);

  const resultRequestedRef = useRef(false);

  const [cameraError, setCameraError] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState("Connecting...");
  const [roomState, setRoomState] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
 
  const isHostRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
const [transcript, setTranscript] = useState("");
const recorderRef = useRef(null);
const audioChunksRef = useRef([]);
const [isReady, setIsReady] = useState(false);
const [opponentReady, setOpponentReady] =
  useState(false);
const [allPlayersReady, setAllPlayersReady] =
  useState(false);
  const pendingCandidatesRef =
  useRef([]);

const readySentRef = useRef(false);

const [debateResult, setDebateResult] = useState(null);
const [showResult, setShowResult] = useState(false);
const [resultLoading, setResultLoading] = useState(false);
const [resultError, setResultError] = useState("");

 async function recordAndTranscribe() {
  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    const recorder = new MediaRecorder(
      stream,
      MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? { mimeType: "audio/webm;codecs=opus" }
        : {}
    );

    recorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(
          event.data
        );
      }
    };

    recorder.onstop = async () => {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      const audioBlob = new Blob(
        audioChunksRef.current,
        {
          type:
            recorder.mimeType ||
            "audio/webm",
        }
      );

      const formData = new FormData();

      formData.append(
        "room_id",
        roomId
      );

      formData.append(
        "speaker",
        playerName
      );

      formData.append(
        "audio",
        audioBlob,
        "multiplayer.webm"
      );

      try {
        const response = await fetch(
          `${API}/multiplayer/transcribe`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data =
          await response.json();

        console.log(
          "TRANSCRIPTION RESULT:",
          data
        );

        if (data.success) {
          setTranscript(data.text);
        } else {
          setTranscript(
            data.message ||
              "No speech detected"
          );
        }
      } catch (error) {
        console.error(
          "Transcription request failed:",
          error
        );
      }

      setIsRecording(false);
    };

    recorder.start();

    setIsRecording(true);

  } catch (error) {
    console.error(
      "Microphone error:",
      error
    );
  }
}


  useEffect(() => {
    let interval;
    let roomInterval;
  
    async function fetchRoomState() {
  try {
    const response = await fetch(
      `${API}/multiplayer/room/${roomId}`
    );

    if (!response.ok) {
      console.error("Failed to fetch room state");
      return;
    }

    const data = await response.json();

    setRoomState(data);

    setRemainingSeconds(
      data.remaining_seconds ?? 0
    );

    // Debate has finished
    if (
      data.status === "finished" &&
      !resultRequestedRef.current
    ) {
      resultRequestedRef.current = true;

      if (
        typeof onDebateFinished === "function"
      ) {
        onDebateFinished();
      }
    }

  } catch (error) {
    console.error(
      "Room state error:",
      error
    );
  }
}

async function onDebateFinished() {
  try {
    setResultLoading(true);
    setResultError("");

    const response = await fetch(
      `${API}/multiplayer/result/${roomId}?player=${encodeURIComponent(
        playerName
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Could not load debate result"
      );
    }

    console.log(
      "🏆 PERSONAL DEBATE RESULT:",
      data
    );

    setDebateResult(data);
    setShowResult(true);

  } catch (error) {
    console.error(
      "Result loading error:",
      error
    );

    setResultError(
      error.message || "Could not load result"
    );

  } finally {
    setResultLoading(false);
  }
}
    async function initialize() {
      try {
        // Get the latest room information
        const res = await fetch(
          `${API}/multiplayer/room/${roomId}`
        );

        const room = await res.json();

        if (room.players && room.players.length >= 2) {
          const host = room.host;

          isHostRef.current = host === playerName;
        }

        // Start camera and microphone
        const stream = await startCamera();

        if (!stream) return;

        const pc = createPeerConnection();

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Give the browser a moment
        // to finish setting up.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        
        interval = setInterval(checkSignals, 1000);
      } catch (error) {
        console.error("WebRTC initialization error:", error);
      }
    }

    initialize();

    roomInterval = setInterval(
  fetchRoomState,
  1000
);

    return () => {
      if (interval) clearInterval(interval);
      if (roomInterval) clearInterval(roomInterval);
    };
  }, [roomId, playerName]);
  // ---------------------------------------------------------
  // Create WebRTC connection
  // ---------------------------------------------------------

  function createPeerConnection() {
  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  });

  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      await sendSignal(
        "ice-candidate",
        event.candidate.toJSON()
      );
    }
  };

pc.ontrack = (event) => {
  console.log(
    "🎥 REMOTE TRACK RECEIVED:",
    event.track.kind,
    event.streams
  );

  if (
    remoteVideoRef.current &&
    event.streams[0]
  ) {
    console.log(
      "🎥 SETTING OPPONENT VIDEO"
    );

    remoteVideoRef.current.srcObject =
      event.streams[0];

    remoteVideoRef.current
      .play()
      .catch((error) => {
        console.error(
          "Remote video play error:",
          error
        );
      });
  }
};

  pc.onconnectionstatechange = () => {
    console.log(
      "WebRTC connection state:",
      pc.connectionState
    );

    if (
      pc.connectionState === "connected"
    ) {
      setConnectionStatus("Connected");
    }

    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected"
    ) {
      setConnectionStatus("Disconnected");
    }
  };

  peerConnectionRef.current = pc;

  return pc;
}

async function sendSignal(type, data) {
  try {
    const response = await fetch(
      `${API}/multiplayer/room/${roomId}`
    );

    if (!response.ok) {
      console.error(
        "Could not get room for signaling"
      );
      return false;
    }

    const room = await response.json();

    const opponent = room.players?.find(
      (player) =>
        player.name !== playerName
    );

    if (!opponent) {
      console.log(
        "No opponent found yet, cannot send signal"
      );
      return false;
    }

    const signalResponse = await fetch(
      `${API}/multiplayer/signal`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          room_id: roomId,
          sender: playerName,
          receiver: opponent.name,
          type,
          data,
        }),
      }
    );

    if (!signalResponse.ok) {
      console.error(
        "Signal request failed:",
        signalResponse.status
      );
      return false;
    }

    console.log(
      `Signal sent: ${type} → ${opponent.name}`
    );

    return true;

  } catch (error) {
    console.error(
      "Signal sending error:",
      error
    );

    return false;
  }
}


  // ---------------------------------------------------------
  // Start camera
  // ---------------------------------------------------------

  async function startCamera() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        stream
  .getAudioTracks()
  .forEach((track) => {
    track.enabled = false;
  });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          stream;
      }

      return stream;
    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      setCameraError(
        "Camera or microphone permission was denied."
      );

      return null;
    }
  }

  // ---------------------------------------------------------
  // HOST creates offer
  // ---------------------------------------------------------
async function createOffer() {
  const pc = peerConnectionRef.current;

  if (!pc) {
    console.log(
      "No peer connection available"
    );
    return;
  }

  if (offerCreatedRef.current) {
    console.log(
      "Offer already created. Skipping."
    );
    return;
  }

  if (pc.signalingState !== "stable") {
    console.log(
      "Cannot create offer. Current state:",
      pc.signalingState
    );
    return;
  }

  try {
    const offer = await pc.createOffer();

    await pc.setLocalDescription(offer);

    const sent = await sendSignal(
      "offer",
      offer
    );

    if (sent) {
      offerCreatedRef.current = true;

      console.log(
        "Offer created and sent successfully"
      );
    } else {
      console.log(
        "Offer was created but not sent"
      );
    }

  } catch (error) {
    console.error(
      "Create offer error:",
      error
    );
  }
}

  // ---------------------------------------------------------
  // Handle incoming signaling messages
  // ---------------------------------------------------------
async function handleSignal(signal) {
  const pc = peerConnectionRef.current;

  if (!pc) return;

  if (signal.sender === playerName) {
    return;
  }

  // -------------------------
  // READY
  // -------------------------

  if (signal.type === "ready") {
    console.log("✅ Opponent is READY");

    setOpponentReady(true);

    return;
  }

  // -------------------------
  // OFFER
  // -------------------------

  if (signal.type === "offer") {
    console.log("📨 Received offer");

    if (pc.signalingState !== "stable") {
      console.log(
        "Ignoring offer. Current state:",
        pc.signalingState
      );
      return;
    }

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription(signal.data)
      );

      console.log(
        "✅ Remote offer applied"
      );

      // Add any ICE candidates that arrived
      // before the remote description
      for (
        const candidate
        of pendingCandidatesRef.current
      ) {
        try {
          await pc.addIceCandidate(candidate);

          console.log(
            "🧊 Queued ICE candidate added"
          );
        } catch (error) {
          console.error(
            "Queued ICE candidate error:",
            error
          );
        }
      }

      pendingCandidatesRef.current = [];

      if (
        pc.signalingState !==
        "have-remote-offer"
      ) {
        console.log(
          "Offer no longer needs an answer. State:",
          pc.signalingState
        );

        return;
      }

      const answer =
        await pc.createAnswer();

      if (
        pc.signalingState !==
        "have-remote-offer"
      ) {
        console.log(
          "Ignoring answer creation. State:",
          pc.signalingState
        );

        return;
      }

      await pc.setLocalDescription(
        answer
      );

      await sendSignal(
        "answer",
        answer
      );

      console.log(
        "✅ Answer sent successfully"
      );

    } catch (error) {
      console.error(
        "❌ Offer handling error:",
        error
      );
    }

    return;
  }

  // -------------------------
  // ANSWER
  // -------------------------

  if (signal.type === "answer") {
    console.log("📨 Received answer");

    if (
      pc.signalingState !==
      "have-local-offer"
    ) {
      console.log(
        "Ignoring duplicate answer. Current state:",
        pc.signalingState
      );

      return;
    }

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription(
          signal.data
        )
      );

      console.log(
        "✅ Remote answer applied successfully"
      );

      // Add queued ICE candidates
      for (
        const candidate
        of pendingCandidatesRef.current
      ) {
        try {
          await pc.addIceCandidate(candidate);

          console.log(
            "🧊 Queued ICE candidate added"
          );
        } catch (error) {
          console.error(
            "Queued ICE candidate error:",
            error
          );
        }
      }

      pendingCandidatesRef.current = [];

    } catch (error) {
      console.error(
        "❌ Answer handling error:",
        error
      );
    }

    return;
  }

  // -------------------------
  // ICE CANDIDATE
  // -------------------------

  if (
    signal.type ===
    "ice-candidate"
  ) {
    try {
      const candidate =
        new RTCIceCandidate(
          signal.data
        );

      // Remote description is already available
      if (
        pc.remoteDescription
      ) {
        await pc.addIceCandidate(
          candidate
        );

        console.log(
          "🧊 ICE candidate added"
        );
      }

      // Remote description has NOT arrived yet
      else {
        console.log(
          "🧊 Remote description not ready — queuing ICE candidate"
        );

        pendingCandidatesRef.current.push(
          candidate
        );
      }

    } catch (error) {
      console.error(
        "❌ ICE candidate error:",
        error
      );
    }

    return;
  }
}
async function markPlayerReady() {
  if (readySentRef.current) {
    return;
  }

  try {
    readySentRef.current = true;

    const response = await fetch(
      `${API}/multiplayer/ready?room_id=${encodeURIComponent(
        roomId
      )}&player_name=${encodeURIComponent(
        playerName
      )}`,
      {
        method: "POST",
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
          "Could not mark player ready"
      );
    }

    setIsReady(true);

    // Tell opponent
    await sendSignal(
      "ready",
      {
        player: playerName,
      }
    );

    console.log(
      "✅ I am READY"
    );

  } catch (error) {
    readySentRef.current = false;

    console.error(
      "Ready error:",
      error
    );
  }
}

useEffect(() => {
  const bothReady =
    isReady && opponentReady;

  setAllPlayersReady(
    bothReady
  );

  if (!bothReady) {
    return;
  }

  console.log(
    "🎤 BOTH PLAYERS READY — MICROPHONE ENABLED"
  );

  const stream =
    localStreamRef.current;

  if (stream) {
    stream
      .getAudioTracks()
      .forEach((track) => {
        track.enabled = true;
      });
  }

}, [
  isReady,
  opponentReady,
]);
  // ---------------------------------------------------------
  // Poll signaling server
  // ---------------------------------------------------------

  async function checkSignals() {
    try {
      const res =
        await fetch(
  `${API}/multiplayer/signals/${roomId}?receiver=${encodeURIComponent(
    playerName
  )}`
)

      const signals =
        await res.json();

      for (
        const signal of signals
      ) {
        await handleSignal(
          signal
        );
      }
    } catch (error) {
      console.error(
        "Signal polling error:",
        error
      );
    }
  }
  async function startMultiplayerRecording() {
  if (recorderRef.current) return;

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

    const audioTracks =
      stream.getAudioTracks();

    console.log(
      "🎙️ MICROPHONE TRACK:",
      audioTracks[0]
    );

    console.log(
      "🎙️ MICROPHONE SETTINGS:",
      audioTracks[0]?.getSettings()
    );

    const recorder = new MediaRecorder(
      stream,
      MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? {
            mimeType: "audio/webm;codecs=opus",
          }
        : {}
    );

    recorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      recorderRef.current = null;
      setIsRecording(false);
const audioBlob = new Blob(
  audioChunksRef.current,
  {
    type:
      recorder.mimeType ||
      "audio/webm",
  }
);

console.log(
  "🎙️ MULTIPLAYER AUDIO:",
  {
    size: audioBlob.size,
    type: audioBlob.type,
    chunks: audioChunksRef.current.length,
  }
);

      await transcribeMultiplayerTurn(
        audioBlob
      );
    };

    recorder.start(250);

    setIsRecording(true);

    console.log(
      "🎤 Multiplayer recording started"
    );

  } catch (error) {
    console.error(
      "Multiplayer microphone error:",
      error
    );
  }
}
  async function transcribeMultiplayerTurn(
  audioBlob
) {
  try {
     console.log(
      "🚀 SENDING MULTIPLAYER AUDIO",
      {
        url: `${API}/multiplayer/transcribe`,
        size: audioBlob.size,
        type: audioBlob.type,
      }
    );
    setTranscript("Transcribing...");

    const formData = new FormData();

    formData.append(
      "room_id",
      roomId
    );

    formData.append(
      "speaker",
      playerName
    );

    formData.append(
      "audio",
      audioBlob,
      "multiplayer.webm"
    );

    console.log(
  "📡 Calling:",
  `${API}/multiplayer/transcribe`
);


    const response = await fetch(
      `${API}/multiplayer/transcribe`,
      {
        method: "POST",
        body: formData,
      }
    );

    console.log(
  "📡 Response status:",
  response.status
);

    const data = await response.json();

    console.log(
      "MULTIPLAYER TRANSCRIPT:",
      data
    );

    if (data.success) {
      setTranscript(data.text);
    } else {
      setTranscript(
        data.message ||
          "No speech detected."
      );
    }

  } catch (error) {
    console.error(
      "Multiplayer transcription error:",
      error
    );

    setTranscript(
      "Transcription failed."
    );
  }
}

function stopMultiplayerRecording() {
  const recorder =
    recorderRef.current;

  if (
    recorder &&
    recorder.state === "recording"
  ) {
    console.log(
      "🛑 Multiplayer recording stopped"
    );

    recorder.stop();
  }
}
  // ---------------------------------------------------------
  // Main WebRTC setup
  // ---------------------------------------------------------
  const players =
  roomState?.players || [];

const currentTurn =
  roomState?.current_turn ?? 0;

const currentPlayer =
  players.length > 0
    ? players[
        currentTurn % players.length
      ]
    : null;

const isMyTurn =
  currentPlayer?.name === playerName;

 useEffect(() => {

  // Don't record until both players are ready
  if (!allPlayersReady) {
    if (recorderRef.current) {
      stopMultiplayerRecording();
    }

    return;
  }

  if (
    isMyTurn &&
    remainingSeconds > 0 &&
    !recorderRef.current
  ) {
    startMultiplayerRecording();
  }

  if (
    !isMyTurn &&
    recorderRef.current
  ) {
    stopMultiplayerRecording();
  }

}, [
  isMyTurn,
  remainingSeconds,
  allPlayersReady,
]);

useEffect(() => {
  if (
    !isHostRef.current ||
    offerCreatedRef.current
  ) {
    return;
  }

  const players =
    roomState?.players || [];

  if (players.length < 2) {
    return;
  }

  if (
    peerConnectionRef.current &&
    peerConnectionRef.current.signalingState ===
      "stable"
  ) {
    createOffer();
  }
}, [
  roomState,
]);


 if (showResult) {
  const result = debateResult?.result || {};

  const fallacyData = result.fallacies || {
  count: 0,
  fallacies: [],
};

const fallacies = Array.isArray(
  fallacyData.fallacies
)
  ? fallacyData.fallacies
  : [];

  const overall =
    Number(result.overall ?? result.score ?? 0);

  const argumentQuality =
    Number(result.argument_quality ?? 0);

  const evidenceUse =
    Number(result.evidence_use ?? 0);

  const rebuttalStrength =
    Number(result.rebuttal_strength ?? 0);

  const isWinner =
    debateResult?.is_winner === true;

  const strengths =
    result.strengths ||
    result.strength ||
    [];

  const improvements =
    result.improvements ||
    result.areas_to_improve ||
    [];

  const feedback =
    result.feedback ||
    result.coach_feedback ||
    "Keep practicing and make your arguments more specific.";

  const coachTip =
    result.coach_tip ||
    "Support your main claim with evidence and a concrete example.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #10162b 0%, #020510 45%, #01030a 100%)",
        color: "#e8edf7",
        padding: "35px 25px 70px",
        boxSizing: "border-box",
        fontFamily: "'Courier New', monospace",
      }}
    >

      {/* TOP LOGIN MESSAGE STYLE */}
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
        }}
      >

        {/* HEADER */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              fontSize: "58px",
              marginBottom: "8px",
            }}
          >
            {isWinner ? "🏆" : "🎤"}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "42px",
              letterSpacing: "5px",
              color: "#3aa8ff",
              textShadow:
                "0 0 18px rgba(58,168,255,0.35)",
            }}
          >
            DEBATE COMPLETE
          </h1>

          <div
            style={{
              marginTop: "18px",
              color: "#7384a8",
              fontSize: "16px",
              letterSpacing: "2px",
            }}
          >
            🤖 {topic || "Multiplayer Debate"}
          </div>

          {/* POSITION */}
          <div
            style={{
              marginTop: "8px",
              color: "#66728d",
              fontSize: "14px",
            }}
          >
            {roomState?.topic
              ? `ROOM ${roomId}`
              : ""}
          </div>
        </div>


        {/* WINNER BANNER */}
        <div
          style={{
            padding: "22px",
            marginBottom: "25px",
            borderRadius: "16px",
            textAlign: "center",
            background: isWinner
              ? "linear-gradient(135deg, rgba(0,255,170,0.10), rgba(24,16,65,0.65))"
              : "linear-gradient(135deg, rgba(58,168,255,0.08), rgba(24,16,65,0.65))",
            border: isWinner
              ? "1px solid rgba(0,255,170,0.45)"
              : "1px solid rgba(58,168,255,0.35)",
            boxShadow: isWinner
              ? "0 0 25px rgba(0,255,170,0.08)"
              : "0 0 25px rgba(58,168,255,0.08)",
          }}
        >
          <div
            style={{
              color: isWinner
                ? "#00ffaa"
                : "#ffcc55",
              fontSize: "22px",
              fontWeight: "bold",
              letterSpacing: "3px",
            }}
          >
            {isWinner
              ? "🏆 YOU ARE THE WINNER"
              : "DEBATE COMPLETE"}
          </div>

          <div
            style={{
              marginTop: "8px",
              color: "#7e8ba8",
              fontSize: "14px",
            }}
          >
            {isWinner
              ? "Excellent performance! Your arguments stood out."
              : "Keep improving — every debate makes you stronger."}
          </div>
        </div>


        {/* MAIN SCORE + BREAKDOWN */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(280px, 1fr) minmax(280px, 1fr)",
            gap: "25px",
          }}
        >

          {/* OVERALL SCORE */}
          <div
            style={{
              background: "#0b101d",
              border: "1px solid rgba(0,212,255,0.28)",
              borderRadius: "18px",
              padding: "38px",
              textAlign: "center",
              minHeight: "260px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                color: "#00d4ff",
                fontSize: "14px",
                letterSpacing: "4px",
              }}
            >
              YOUR SCORE
            </div>

            <div
              style={{
                marginTop: "20px",
                fontSize: "82px",
                fontWeight: "bold",
                color:
                  overall >= 7
                    ? "#00d4ff"
                    : overall >= 5
                    ? "#ffcc55"
                    : "#ff4b5c",
                textShadow:
                  "0 0 25px rgba(0,212,255,0.18)",
              }}
            >
              {overall.toFixed(1)}
            </div>

            <div
              style={{
                color: "#63718f",
                fontSize: "15px",
                letterSpacing: "3px",
              }}
            >
              AVG SCORE / 10
            </div>

            <div
              style={{
                display: "inline-block",
                marginTop: "20px",
                padding: "9px 25px",
                borderRadius: "25px",
                border:
                  overall >= 7
                    ? "1px solid #00ffaa"
                    : "1px solid #ffcc55",
                color:
                  overall >= 7
                    ? "#00ffaa"
                    : "#ffcc55",
                fontSize: "13px",
                letterSpacing: "2px",
              }}
            >
              {overall >= 8
                ? "EXCELLENT"
                : overall >= 7
                ? "GOOD PERFORMANCE"
                : overall >= 5
                ? "KEEP IMPROVING"
                : "NEEDS WORK"}
            </div>
          </div>


          {/* SCORE BREAKDOWN */}
          <div
            style={{
              background: "#0b101d",
              border:
                "1px solid rgba(117,75,255,0.32)",
              borderRadius: "18px",
              padding: "30px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                color: "#7b6cff",
                fontSize: "14px",
                letterSpacing: "4px",
                marginBottom: "25px",
              }}
            >
              PERFORMANCE BREAKDOWN
            </div>

            {[
              [
                "ARGUMENT QUALITY",
                argumentQuality,
                "#00d4ff",
              ],
              [
                "EVIDENCE USE",
                evidenceUse,
                "#00ffaa",
              ],
              [
                "REBUTTAL STRENGTH",
                rebuttalStrength,
                "#a77bff",
              ],
            ].map(
              ([label, value, color]) => (
                <div
                  key={label}
                  style={{
                    marginBottom: "23px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: "8px",
                      fontSize: "13px",
                      letterSpacing: "1px",
                    }}
                  >
                    <span
                      style={{
                        color: "#8190ad",
                      }}
                    >
                      {label}
                    </span>

                    <span
                      style={{
                        color,
                        fontWeight: "bold",
                      }}
                    >
                      {value}/10
                    </span>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      background: "#202636",
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          value * 10
                        )}%`,
                        height: "100%",
                        background: color,
                        borderRadius: "10px",
                        boxShadow:
                          `0 0 10px ${color}`,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>


        {/* STRENGTHS + IMPROVEMENTS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "25px",
            marginTop: "25px",
          }}
        >

          {/* STRENGTHS */}
          <div
            style={{
              background: "#0b101d",
              border:
                "1px solid rgba(0,255,170,0.28)",
              borderRadius: "18px",
              padding: "30px",
            }}
          >
            <div
              style={{
                color: "#00ffaa",
                fontSize: "14px",
                letterSpacing: "3px",
                marginBottom: "20px",
              }}
            >
              YOUR STRENGTHS
            </div>

            {Array.isArray(strengths) &&
            strengths.length > 0 ? (
              strengths.map(
                (item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "14px 16px",
                      marginBottom: "10px",
                      background:
                        "rgba(0,255,170,0.06)",
                      borderRadius: "10px",
                      color: "#c8d4e8",
                      lineHeight: "1.6",
                    }}
                  >
                    <span
                      style={{
                        color: "#00ffaa",
                        marginRight: "10px",
                      }}
                    >
                      ✓
                    </span>

                    {typeof item ===
                    "string"
                      ? item
                      : JSON.stringify(item)}
                  </div>
                )
              )
            ) : (
              <div
                style={{
                  color: "#8290a8",
                  lineHeight: "1.7",
                }}
              >
                Your performance showed
                useful debate skills. Keep
                building on your strongest
                arguments.
              </div>
            )}
          </div>


          {/* IMPROVEMENTS */}
          <div
            style={{
              background: "#0b101d",
              border:
                "1px solid rgba(255,204,85,0.28)",
              borderRadius: "18px",
              padding: "30px",
            }}
          >
            <div
              style={{
                color: "#ffcc55",
                fontSize: "14px",
                letterSpacing: "3px",
                marginBottom: "20px",
              }}
            >
              HOW TO IMPROVE
            </div>

            {Array.isArray(improvements) &&
            improvements.length > 0 ? (
              improvements.map(
                (item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      gap: "14px",
                      padding: "14px",
                      marginBottom: "10px",
                      background:
                        "rgba(255,204,85,0.05)",
                      borderRadius: "10px",
                      color: "#c8d4e8",
                      lineHeight: "1.6",
                    }}
                  >
                    <span
                      style={{
                        minWidth: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background:
                          "rgba(255,204,85,0.12)",
                        color: "#ffcc55",
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "center",
                        fontWeight: "bold",
                      }}
                    >
                      {index + 1}
                    </span>

                    <span>
                      {typeof item ===
                      "string"
                        ? item
                        : JSON.stringify(item)}
                    </span>
                  </div>
                )
              )
            ) : (
              <div
                style={{
                  color: "#8290a8",
                  lineHeight: "1.7",
                }}
              >
                Focus on giving stronger
                evidence and concrete
                examples for your claims.
              </div>
            )}
          </div>
        </div>


        {/* AI COACH */}
        <div
          style={{
            marginTop: "25px",
            background:
              "linear-gradient(135deg, #11102d, #15112d)",
            border:
              "1px solid rgba(123,108,255,0.35)",
            borderRadius: "18px",
            padding: "30px",
          }}
        >
          <div
            style={{
              color: "#a77bff",
              fontSize: "14px",
              letterSpacing: "3px",
              marginBottom: "18px",
            }}
          >
            🤖 AI COACH FEEDBACK
          </div>

          {/* FALLACY DETECTION */}
<div
  style={{
    marginTop: "25px",
    background: "#0b101d",
    border:
      "1px solid rgba(255,75,92,0.28)",
    borderRadius: "18px",
    padding: "30px",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    }}
  >
    <div
      style={{
        color: "#ff4b5c",
        fontSize: "14px",
        letterSpacing: "3px",
      }}
    >
      FALLACY DETECTION
    </div>

    <div
      style={{
        minWidth: "34px",
        height: "34px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          fallacies.length > 0
            ? "rgba(255,75,92,0.12)"
            : "rgba(0,255,170,0.10)",
        color:
          fallacies.length > 0
            ? "#ff4b5c"
            : "#00ffaa",
        fontWeight: "bold",
      }}
    >
      {fallacies.length}
    </div>
  </div>

  {fallacies.length === 0 ? (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        background:
          "rgba(0,255,170,0.05)",
        border:
          "1px solid rgba(0,255,170,0.16)",
      }}
    >
      <div
        style={{
          fontSize: "18px",
          color: "#00ffaa",
          marginBottom: "8px",
        }}
      >
        ✓ No clear logical fallacies detected
      </div>

      <div
        style={{
          color: "#8290a8",
          lineHeight: "1.7",
        }}
      >
        Your arguments did not contain any
        clearly identifiable logical fallacies.
      </div>
    </div>
  ) : (
    <div>
      {fallacies.map(
        (fallacy, index) => (
          <div
            key={index}
            style={{
              padding: "18px",
              marginBottom:
                index === fallacies.length - 1
                  ? "0"
                  : "12px",
              borderRadius: "12px",
              background:
                "rgba(255,75,92,0.05)",
              border:
                "1px solid rgba(255,75,92,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#ff6b78",
                fontWeight: "bold",
                fontSize: "16px",
                marginBottom: "8px",
              }}
            >
              ⚠️ {fallacy.name}
            </div>

            <div
              style={{
                color: "#aebbd0",
                lineHeight: "1.7",
                fontSize: "14px",
              }}
            >
              {fallacy.explanation}
            </div>
          </div>
        )
      )}
    </div>
  )}
</div>

          <div
            style={{
              color: "#d3d9e7",
              fontSize: "17px",
              lineHeight: "1.8",
            }}
          >
            {feedback}
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "18px",
              borderRadius: "12px",
              background:
                "rgba(0,212,255,0.05)",
              border:
                "1px solid rgba(0,212,255,0.18)",
            }}
          >
            <div
              style={{
                color: "#00d4ff",
                fontSize: "12px",
                letterSpacing: "2px",
                marginBottom: "8px",
              }}
            >
              NEXT COACHING TIP
            </div>

            <div
              style={{
                color: "#b9c5da",
                lineHeight: "1.7",
              }}
            >
              {coachTip}
            </div>
          </div>
        </div>


        {/* WINNER */}
        <div
          style={{
            marginTop: "25px",
            padding: "25px",
            textAlign: "center",
            borderRadius: "18px",
            background: "#0b101d",
            border:
              "1px solid rgba(255,204,85,0.25)",
          }}
        >
          <div
            style={{
              color: "#ffcc55",
              fontSize: "12px",
              letterSpacing: "3px",
            }}
          >
            FINAL RESULT
          </div>

          <div
            style={{
              marginTop: "10px",
              fontSize: "25px",
              color: isWinner
                ? "#00ffaa"
                : "#ff8a8a",
              fontWeight: "bold",
            }}
          >
            {isWinner
              ? `🏆 ${playerName} — WINNER`
              : `🎤 ${playerName} — KEEP PRACTICING`}
          </div>

          {!isWinner &&
            debateResult?.winner && (
              <div
                style={{
                  marginTop: "10px",
                  color: "#74819b",
                  fontSize: "13px",
                }}
              >
                The winner was determined
                by the AI debate evaluation.
              </div>
            )}
        </div>


        {/* BUTTONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              window.location.reload();
            }}
            style={{
              padding: "14px 30px",
              borderRadius: "10px",
              border: "none",
              background:
                "linear-gradient(90deg, #00cfff, #704cff)",
              color: "white",
              fontFamily:
                "'Courier New', monospace",
              fontWeight: "bold",
              letterSpacing: "2px",
              cursor: "pointer",
              boxShadow:
                "0 0 20px rgba(0,212,255,0.18)",
            }}
          >
            PLAY AGAIN
          </button>
        </div>

      </div>
    </div>
  );
}
return (
  <div
    style={{
      minHeight: "100vh",
      width: "100%",
      background:
        "radial-gradient(circle at 50% -20%, #182044 0%, #070b18 38%, #02040b 75%)",
      color: "#eef4ff",
      fontFamily: "'Courier New', monospace",
      overflow: "hidden",
      position: "relative",
    }}
  >
    {/* =========================================
        TOP BAR
    ========================================= */}

    <div
      style={{
        height: "72px",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        borderBottom:
          "1px solid rgba(90,140,255,0.15)",
        background:
          "rgba(3,7,18,0.82)",
        backdropFilter: "blur(15px)",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 20,
      }}
    >
      {/* LOGO */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "11px",
          minWidth: "235px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg,#00d9ff,#715cff)",
            boxShadow:
              "0 0 20px rgba(0,217,255,0.25)",
            fontSize: "19px",
          }}
        >
          🎙
        </div>

        <div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              letterSpacing: "3px",
            }}
          >
            VOICE
            <span
              style={{
                color: "#00d9ff",
              }}
            >
              VERSUS
            </span>
          </div>

          <div
            style={{
              fontSize: "8px",
              color: "#667695",
              letterSpacing: "2px",
              marginTop: "3px",
            }}
          >
            AI DEBATE ARENA
          </div>
        </div>
      </div>

      {/* TOPIC */}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "center",
          padding: "0 25px",
        }}
      >
        <div
          style={{
            color: "#617394",
            fontSize: "8px",
            letterSpacing: "3px",
            marginBottom: "5px",
          }}
        >
          DEBATE TOPIC
        </div>

        <div
          style={{
            color: "#edf4ff",
            fontSize: "14px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={topic}
        >
          {topic || "Debate Topic"}
        </div>
      </div>

      {/* RIGHT INFO */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          minWidth: "330px",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            padding: "7px 11px",
            borderRadius: "7px",
            background:
              "rgba(20,29,55,0.8)",
            border:
              "1px solid rgba(90,140,255,0.18)",
            color: "#7f90b2",
            fontSize: "9px",
            letterSpacing: "1px",
          }}
        >
          ROOM{" "}
          <span
            style={{
              color: "#dbe7ff",
            }}
          >
            {roomId}
          </span>
        </div>

        <div
          style={{
            padding: "7px 11px",
            borderRadius: "7px",
            background:
              "rgba(20,29,55,0.8)",
            border:
              "1px solid rgba(90,140,255,0.18)",
            color: "#7f90b2",
            fontSize: "9px",
            letterSpacing: "1px",
          }}
        >
          ROUND{" "}
          <span
            style={{
              color: "#00d9ff",
            }}
          >
            {roomState?.round || 1}
          </span>
          {" / "}
          {roomState?.max_rounds || 1}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 11px",
            borderRadius: "7px",
            background:
              "rgba(0,255,170,0.05)",
            border:
              "1px solid rgba(0,255,170,0.18)",
            color: "#00ffaa",
            fontSize: "9px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#00ffaa",
              boxShadow:
                "0 0 8px #00ffaa",
            }}
          />

          {connectionStatus === "Connected"
            ? "LIVE"
            : connectionStatus.toUpperCase()}
        </div>
      </div>
    </div>

    {/* =========================================
        VIDEO CALL AREA
    ========================================= */}

    <div
      style={{
        height:
          "calc(100vh - 72px)",
        position: "relative",
        overflow: "hidden",
        background: "#03050c",
      }}
    >

      {/* =====================================
          OPPONENT MAIN VIDEO
      ===================================== */}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg,#090e1c,#03050c)",
        }}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "#03050c",
            display: "block",
          }}
        />

        {/* DARK VIDEO GRADIENT */}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg,rgba(2,5,16,0.45) 0%,transparent 25%,transparent 65%,rgba(2,5,16,0.9) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* OPPONENT FALLBACK */}

        {!remoteVideoRef.current?.srcObject && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg,#18233d,#10172a)",
                border:
                  "1px solid rgba(90,140,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "38px",
                color: "#6e7e9d",
              }}
            >
              👤
            </div>

            <div
              style={{
                marginTop: "15px",
                color: "#71809c",
                fontSize: "13px",
              }}
            >
              Waiting for opponent video...
            </div>
          </div>
        )}

        {/* OPPONENT NAME */}

        <div
          style={{
            position: "absolute",
            left: "25px",
            bottom: "95px",
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
            }}
          >
            <div
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background:
                  !isMyTurn
                    ? "#ff4d68"
                    : "#66728c",
                boxShadow:
                  !isMyTurn
                    ? "0 0 12px #ff4d68"
                    : "none",
              }}
            />

            <span
              style={{
                fontSize: "17px",
                fontWeight: "bold",
              }}
            >
              {opponentName ||
                currentPlayer?.name ||
                "Opponent"}
            </span>
          </div>

          <div
            style={{
              marginTop: "5px",
              marginLeft: "18px",
              color: !isMyTurn
                ? "#ff7084"
                : "#72809c",
              fontSize: "9px",
              letterSpacing: "2px",
            }}
          >
            {!isMyTurn
              ? "SPEAKING"
              : "WAITING"}
          </div>
        </div>
      </div>

      {/* =====================================
          YOUR VIDEO — TOP RIGHT
      ===================================== */}

      <div
        style={{
          position: "absolute",
          top: "22px",
          right: "22px",
          width: "220px",
          height: "145px",
          borderRadius: "13px",
          overflow: "hidden",
          background: "#080c17",
          border: isMyTurn
            ? "2px solid #00d9ff"
            : "1px solid rgba(150,170,210,0.28)",
          boxShadow: isMyTurn
            ? "0 0 25px rgba(0,217,255,0.25)"
            : "0 10px 35px rgba(0,0,0,0.45)",
          zIndex: 10,
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
            background: "#050812",
          }}
        />

        {/* YOUR NAME */}

        <div
          style={{
            position: "absolute",
            left: "9px",
            bottom: "8px",
            padding: "5px 8px",
            borderRadius: "6px",
            background:
              "rgba(0,0,0,0.65)",
            backdropFilter: "blur(5px)",
            fontSize: "9px",
            color: "#e6efff",
          }}
        >
          You
        </div>

        {/* LIVE INDICATOR */}

        {isRecording && (
          <div
            style={{
              position: "absolute",
              right: "9px",
              top: "9px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 7px",
              borderRadius: "6px",
              background:
                "rgba(0,0,0,0.65)",
              color: "#ff5068",
              fontSize: "8px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#ff5068",
                boxShadow:
                  "0 0 8px #ff5068",
              }}
            />

            LIVE
          </div>
        )}
      </div>
      
      {!allPlayersReady && (
  <div
    style={{
      position: "absolute",
      left: "50%",
      bottom: "35px",
      transform:
        "translateX(-50%)",
      zIndex: 30,
      padding: "18px 24px",
      borderRadius: "14px",
      background:
        "rgba(4,8,19,0.92)",
      border:
        "1px solid rgba(0,217,255,0.2)",
      backdropFilter:
        "blur(15px)",
      textAlign: "center",
      minWidth: "280px",
    }}
  >
    <div
      style={{
        color: "#dce8ff",
        fontSize: "13px",
        fontWeight: "bold",
        marginBottom: "12px",
      }}
    >
      {isReady
        ? "Waiting for opponent..."
        : "Ready to debate?"}
    </div>

    <div
      style={{
        display: "flex",
        justifyContent:
          "center",
        gap: "15px",
        marginBottom: "15px",
        fontSize: "9px",
      }}
    >
      <span
        style={{
          color: isReady
            ? "#00ffaa"
            : "#71809c",
        }}
      >
        {isReady ? "✓" : "○"} YOU
      </span>

      <span
        style={{
          color: opponentReady
            ? "#00ffaa"
            : "#71809c",
        }}
      >
        {opponentReady
          ? "✓"
          : "○"}{" "}
        OPPONENT
      </span>
    </div>

    {!isReady && (
      <button
        onClick={markPlayerReady}
        style={{
          padding:
            "11px 28px",
          borderRadius: "9px",
          border:
            "1px solid rgba(0,217,255,0.4)",
          background:
            "linear-gradient(135deg,#00bfe8,#7250ed)",
          color: "white",
          cursor: "pointer",
          fontFamily:
            "'Courier New', monospace",
          fontSize: "10px",
          fontWeight: "bold",
          letterSpacing: "1.5px",
        }}
      >
        🎤 I'M READY
      </button>
    )}
  </div>
)}

{/* =====================================
    BOTH PLAYERS READY
===================================== */}

{allPlayersReady && (
  <div
    style={{
      position: "absolute",
      top: "90px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 25,
      padding: "9px 16px",
      borderRadius: "8px",
      background: "rgba(0,255,170,0.08)",
      border: "1px solid rgba(0,255,170,0.25)",
      color: "#00ffaa",
      fontSize: "9px",
      letterSpacing: "1.5px",
    }}
  >
    ✓ BOTH PLAYERS READY
  </div>
)}
      {/* =====================================
          TURN + TIMER — BOTTOM LEFT
      ===================================== */}

      <div
        style={{
          position: "absolute",
          left: "25px",
          bottom: "22px",
          zIndex: 15,
          padding: "10px 14px",
          borderRadius: "10px",
          background:
            "rgba(4,8,19,0.82)",
          border: isMyTurn
            ? "1px solid rgba(0,217,255,0.35)"
            : "1px solid rgba(120,140,180,0.18)",
          backdropFilter:
            "blur(14px)",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
          }}
        >
          {/* TURN DOT */}

          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background:
                isMyTurn
                  ? "#00d9ff"
                  : "#66728d",
              boxShadow:
                isMyTurn
                  ? "0 0 10px #00d9ff"
                  : "none",
            }}
          />

          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                color: isMyTurn
                  ? "#00d9ff"
                  : "#d1daea",
                letterSpacing: "1px",
              }}
            >
              {isMyTurn
                ? isRecording
                  ? "YOUR TURN"
                  : "YOUR TURN"
                : `${
                    currentPlayer?.name ||
                    opponentName ||
                    "OPPONENT"
                  }'S TURN`}
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "8px",
                color: "#667695",
                letterSpacing: "1px",
              }}
            >
              {isMyTurn
                ? "SPEAK NOW"
                : "LISTEN"}
            </div>
          </div>

          {/* TIMER */}

          <div
            style={{
              marginLeft: "7px",
              paddingLeft: "12px",
              borderLeft:
                "1px solid rgba(120,140,180,0.18)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                letterSpacing: "1px",
                color:
                  remainingSeconds <= 5
                    ? "#ff5068"
                    : "#eef4ff",
                textShadow:
                  remainingSeconds <= 5
                    ? "0 0 12px rgba(255,80,104,0.4)"
                    : "none",
              }}
            >
              {String(
                Math.floor(
                  remainingSeconds / 60
                )
              ).padStart(2, "0")}
              :
              {String(
                remainingSeconds % 60
              ).padStart(2, "0")}
            </div>

            <div
              style={{
                fontSize: "7px",
                color: "#63718d",
                letterSpacing: "1px",
              }}
            >
              TIME LEFT
            </div>
          </div>
        </div>
      </div>

      {/* =====================================
          LIVE TRANSCRIPT
      ===================================== */}

      {transcript && (
        <div
          style={{
            position: "absolute",
            left: "25px",
            right: "270px",
            bottom: "22px",
            transform: "translateY(-68px)",
            zIndex: 14,
            padding: "9px 13px",
            borderRadius: "9px",
            background:
              "rgba(3,7,17,0.75)",
            border:
              "1px solid rgba(0,217,255,0.13)",
            backdropFilter:
              "blur(10px)",
          }}
        >
          <div
            style={{
              color: "#00d9ff",
              fontSize: "7px",
              letterSpacing: "2px",
              marginBottom: "4px",
            }}
          >
            LIVE TRANSCRIPT
          </div>

          <div
            style={{
              color: "#c5d1e6",
              fontSize: "11px",
              lineHeight: "1.4",
              maxHeight: "32px",
              overflow: "hidden",
            }}
          >
            {transcript}
          </div>
        </div>
      )}

      {/* =====================================
          MICROPHONE STATUS
      ===================================== */}

      <div
        style={{
          position: "absolute",
          right: "25px",
          bottom: "22px",
          zIndex: 16,
          display: "flex",
          alignItems: "center",
          gap: "7px",
          color: isRecording
            ? "#00ffaa"
            : "#66728d",
          fontSize: "8px",
          letterSpacing: "1.5px",
        }}
      >
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background:
              isRecording
                ? "#00ffaa"
                : "#4a556d",
            boxShadow:
              isRecording
                ? "0 0 10px #00ffaa"
                : "none",
          }}
        />

        {isRecording
          ? "MIC ACTIVE"
          : "MIC STANDBY"}
      </div>

      {/* =====================================
          CAMERA ERROR
      ===================================== */}

      {cameraError && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform:
              "translateX(-50%)",
            zIndex: 30,
            padding: "11px 17px",
            borderRadius: "9px",
            background:
              "rgba(100,20,30,0.9)",
            border:
              "1px solid rgba(255,70,90,0.35)",
            color: "#ff9aa8",
            fontSize: "10px",
          }}
        >
          ⚠ {cameraError}
        </div>
      )}
    </div>
  </div>
);
}