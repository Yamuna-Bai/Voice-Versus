from urllib import response

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import os
import httpx
from pydantic import BaseModel
from uuid import uuid4
import time
from dotenv import load_dotenv

load_dotenv()

from backend.services.multiplayer_judge_service import (
    judge_multiplayer_debate
)

router = APIRouter(prefix="/multiplayer", tags=["Multiplayer"])



class CreateRoomRequest(BaseModel):
    player_name: str
    topic: str


class JoinRoomRequest(BaseModel):
    room_id: str
    player_name: str
    
class StartDebateRequest(BaseModel):
    room_id: str
    
class SignalRequest(BaseModel):
    room_id: str
    sender: str
    receiver: str
    type: str
    data: dict


rooms = {}
signals = {}
TURN_DURATION = 20
MAX_ROUNDS = 1


def update_turn(room):
    if room["status"] != "started":
        return
    
    
    if room["turn_started_at"] is None:
        return

    if len(room["players"]) < 2:
        return

    elapsed = int(time.time() - room["turn_started_at"])

    if elapsed < TURN_DURATION:
        return

    turns_passed = elapsed // TURN_DURATION

    room["current_turn"] += turns_passed
    room["turn_started_at"] = time.time()

    total_turns = MAX_ROUNDS * 2

    if room["current_turn"] >= total_turns:
        room["status"] = "finished"
        room["current_turn"] = total_turns - 1
        return

    room["round"] = (room["current_turn"] // 2) + 1

@router.post("/create-room")
def create_room(req: CreateRoomRequest):

    room_id = str(uuid4())[:6].upper()
    rooms[room_id] = {
        "room_id": room_id,
        "host": req.player_name,

    "players": [
        {
            "name": req.player_name,
            "ready": False,
            "score": 0,
        }
    ],

    "status": "waiting",
    "topic": req.topic,

    "current_turn": 0,
    "round": 1,
    "max_rounds": MAX_ROUNDS,
    "turn_duration": TURN_DURATION,
    "turn_started_at": None,

    "messages": [],
    "winner": None,
    "evaluation": None
    }

    return {
        "success": True,
        "room_id": room_id,
    }


@router.post("/join-room")
def join_room(req: JoinRoomRequest):

    if req.room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    room = rooms[req.room_id]

    if len(room["players"]) >= 2:
        raise HTTPException(
            status_code=400,
            detail="Room is full"
        )

    room["players"].append({
        "name": req.player_name,
        "ready": False,
        "score": 0,
    })

    room["status"] = "ready"

    print(
        "👥 PLAYER JOINED:",
        room["room_id"],
        room["players"]
    )

    return {
        "success": True,
        "room_id": req.room_id,
    }


@router.get("/room/{room_id}")
def get_room(room_id: str):

    if room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    room = rooms[room_id]

    print(
        "🏠 ROOM STATE:",
        room_id,
        "PLAYERS:",
        len(room["players"]),
        room["players"]
    )

    response = {
        "room_id": room["room_id"],
        "topic": room["topic"],
        "status": room["status"],
        "host": room["host"],
        "players": room["players"],
        "current_turn": room["current_turn"],
        "round": room["round"],
        "remaining_seconds": 0,
    }

    # ---------------------------------
    # DEBATE TIMER / TURN MANAGEMENT
    # ---------------------------------

    if (
        room["status"] == "started"
        and room["turn_started_at"] is not None
    ):

        elapsed = int(
            time.time() -
            room["turn_started_at"]
        )

        # Current player's turn finished
        if elapsed >= TURN_DURATION:

            # Sruj finished → Rahul's turn
            if room["current_turn"] == 0:

                room["current_turn"] = 1
                room["turn_started_at"] = time.time()

                print(
                    "🔄 TURN CHANGED: Rahul's turn"
                )

                elapsed = 0

            # Rahul finished → debate over
            else:

                room["status"] = "finished"
                room["turn_started_at"] = None

                print(
                    "🏁 DEBATE FINISHED"
                )

                response["status"] = "finished"
                response["remaining_seconds"] = 0

                return response

        remaining = max(
            0,
            TURN_DURATION - elapsed
        )

        response["remaining_seconds"] = remaining

    else:

        response["remaining_seconds"] = 0

    return response

@router.post("/start")
def start_debate(req: StartDebateRequest):

    if req.room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    room = rooms[req.room_id]

    if len(room["players"]) < 2:
        raise HTTPException(
            status_code=400,
            detail="Waiting for opponent"
        )

    room["status"] = "started"
    room["current_turn"] = 0
    room["round"] = 1
    room["turn_started_at"] = None

    return {
        "success": True,
        "topic": room["topic"]
    }
    
    
    
@router.post("/ready")
def player_ready(room_id: str, player_name: str):

    if room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    room = rooms[room_id]

    player = next(
        (
            p for p in room["players"]
            if p["name"] == player_name
        ),
        None
    )

    if not player:
        raise HTTPException(
            status_code=403,
            detail="Player is not part of this room"
        )

    player["ready"] = True

    # Both players are ready
    if all(
        p["ready"]
        for p in room["players"]
    ) and len(room["players"]) == 2:

        # Start the actual debate timer NOW
        if room["turn_started_at"] is None:
            room["turn_started_at"] = time.time()

    return {
        "success": True,
        "ready": True,
        "all_ready": all(
            p["ready"]
            for p in room["players"]
        ),
    }
    
@router.post("/signal")
def send_signal(req: SignalRequest):

    if req.room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    if req.room_id not in signals:
        signals[req.room_id] = []

    signals[req.room_id].append({
        "sender": req.sender,
        "receiver": req.receiver,
        "type": req.type,
        "data": req.data,
    })

    return {
        "success": True
    }
@router.get("/signals/{room_id}")
def get_signals(
    room_id: str,
    receiver: str,
):

    if room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    room_signals = signals.get(
        room_id,
        []
    )

    new_signals = []
    remaining_signals = []

    for signal in room_signals:

        if signal["receiver"] == receiver:
            new_signals.append(signal)
        else:
            remaining_signals.append(signal)

    signals[room_id] = remaining_signals

    return new_signals

async def multiplayer_speech_to_text(
    audio_bytes: bytes,
    content_type: str
) -> str:
    print("🔥 MULTIPLAYER SPEECH FUNCTION CALLED")
    api_key = os.getenv("DEEPGRAM_API_KEY")
    print(
    "🔥 DEEPGRAM KEY FOUND:",
    bool(api_key)
)
    if not api_key:
        raise RuntimeError(
            "Missing DEEPGRAM_API_KEY"
        )

    query = (
        "?model=nova-2"
        "&language=en-US"
        "&smart_format=true"
        "&punctuate=true"
        "&filler_words=false"
        "&channels=1"
        "&alternatives=1"
    )

    async with httpx.AsyncClient(
        timeout=40.0
    ) as client:

        print("🎙️ SENDING AUDIO TO DEEPGRAM")
        response = await client.post(
            "https://api.deepgram.com/v1/listen" + query,
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": "audio/webm",
            },
            content=audio_bytes,
        )
        print(
    "🎙️ DEEPGRAM STATUS:",
    response.status_code
)

        print(
    "🎙️ DEEPGRAM RAW RESPONSE:",
    response.text
)

        response.raise_for_status()

        data = response.json()
        print("🎙️ DEEPGRAM MULTIPLAYER RESPONSE:")
        print(data)

    return (
        data.get("results", {})
        .get("channels", [{}])[0]
        .get("alternatives", [{}])[0]
        .get("transcript", "")
        or ""
    ).strip()

@router.post("/transcribe")
async def multiplayer_transcribe(
    room_id: str = Form(...),
    speaker: str = Form(...),
    audio: UploadFile = File(...),
):
    if room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    audio_bytes = await audio.read()
   
    print(
    "🎙️ MULTIPLAYER AUDIO RECEIVED:",
    len(audio_bytes),
    audio.content_type
)
    if not audio_bytes:
        raise HTTPException(
            status_code=400,
            detail="No audio received"
        )

    try:
        transcript = await multiplayer_speech_to_text(
            audio_bytes,
            audio.content_type or "audio/webm"
        )
    except Exception as e:
        print("MULTIPLAYER DEEPGRAM ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    if not transcript:
        return {
            "success": False,
            "message": "No speech detected"
        }

    message = {
        "speaker": speaker,
        "text": transcript,
    }

    rooms[room_id]["messages"].append(message)

    return {
        "success": True,
        "speaker": speaker,
        "text": transcript,
    }
    
@router.get("/result/{room_id}")
async def get_debate_result(
    room_id: str,
    player: str,
):
    if room_id not in rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    room = rooms[room_id]

    update_turn(room)

    if room["status"] != "finished":
        return {
            "finished": False,
            "message": "Debate is still in progress."
        }

    # Generate evaluation only once
    if not room.get("evaluation"):

        if len(room["players"]) < 2:
            raise HTTPException(
                status_code=400,
                detail="Not enough players"
            )

        try:
            evaluation = await judge_multiplayer_debate(
                topic=room["topic"],
                players=room["players"],
                messages=room["messages"],
            )

        except Exception as e:
            print(
                "MULTIPLAYER JUDGE ERROR:",
                e
            )

            raise HTTPException(
                status_code=500,
                detail="Could not evaluate debate"
            )

        if "error" in evaluation:
            raise HTTPException(
                status_code=500,
                detail=evaluation["error"]
            )

        room["evaluation"] = evaluation
        room["winner"] = evaluation.get("winner")

    evaluation = room["evaluation"]

    # Make sure the requested player actually belongs
    # to this room.
    player_names = [
        p["name"]
        for p in room["players"]
    ]

    if player not in player_names:
        raise HTTPException(
            status_code=403,
            detail="Player is not part of this room"
        )

    player_result = (
        evaluation
        .get("players", {})
        .get(player)
    )

    if not player_result:
        raise HTTPException(
            status_code=404,
            detail="Player evaluation not found"
        )

    winner = evaluation.get(
        "winner"
    )

    return {
        "finished": True,
        "player": player,
        "result": player_result,
        "winner": winner,
        "is_winner": player == winner,
        "winner_reason": (
            evaluation.get("winner_reason")
            if player == winner
            else None
        ),
    }