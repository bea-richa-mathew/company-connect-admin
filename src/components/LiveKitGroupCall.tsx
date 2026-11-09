
import { useState } from "react";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  ParticipantTile,
  ControlBar,
  ConnectionStateToast,
} from "@livekit/components-react";

import {
  Track,
  type Participant,
} from "livekit-client";

import {
  PhoneOff,
  Users,
  Mic,
  Video,
  X,
} from "lucide-react";

import "@livekit/components-styles";

// ---------------------------------------------
// TYPES
// ---------------------------------------------

type CallMode = "audio" | "video";

interface LiveKitGroupCallProps {
  token: string;
  serverUrl: string;
  mode: CallMode;
  roomName: string;
  onLeave: () => void;
}

// ---------------------------------------------
// PARTICIPANT AVATAR
// ---------------------------------------------

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function AudioParticipant({
  participant,
}: {
  participant: Participant;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
        {getInitials(
          participant.name ||
            participant.identity ||
            "User"
        )}
      </div>

      <div className="text-center">
        <p className="font-semibold text-white">
          {participant.name ||
            participant.identity}
        </p>

        <p className="mt-1 text-xs text-zinc-400">
          {participant.isMicrophoneEnabled
            ? "Microphone on"
            : "Microphone muted"}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------
// AUDIO CALL CONTENT
// ---------------------------------------------

function AudioCallContent() {
  const participants = useParticipants();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Group Audio Call
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {participants.length} participant
              {participants.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <div className="rounded-xl bg-zinc-800 p-3 text-indigo-400">
            <Users size={22} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((participant) => (
            <AudioParticipant
              key={participant.identity}
              participant={participant}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center border-t border-zinc-800 bg-zinc-950 p-4">
        <ControlBar
          controls={{
            microphone: true,
            camera: false,
            screenShare: false,
            chat: false,
            leave: true,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------
// VIDEO CALL CONTENT
// ---------------------------------------------

function VideoCallContent() {
  return (
    <div className="h-full">
      <VideoConference />
    </div>
  );
}

// ---------------------------------------------
// MAIN LIVEKIT GROUP CALL COMPONENT
// ---------------------------------------------

export default function LiveKitGroupCall({
  token,
  serverUrl,
  mode,
  roomName,
  onLeave,
}: LiveKitGroupCallProps) {
  const [showDetails, setShowDetails] =
    useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-2 sm:p-5">
      <div className="flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-indigo-600/20 p-2 text-indigo-400">
              {mode === "video" ? (
                <Video size={21} />
              ) : (
                <Mic size={21} />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate font-semibold">
                {mode === "video"
                  ? "Group Video Call"
                  : "Group Audio Call"}
              </h2>

              <p className="truncate text-xs text-zinc-400">
                LiveKit meeting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setShowDetails((previous) => !previous)
              }
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Room Info
            </button>

            <button
              type="button"
              onClick={onLeave}
              className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700"
              title="Leave call"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ROOM DETAILS */}

        {showDetails && (
          <div className="border-b border-zinc-800 bg-zinc-900 px-5 py-3 text-xs text-zinc-400">
            <p>
              Room:{" "}
              <span className="break-all text-zinc-200">
                {roomName}
              </span>
            </p>

            <p className="mt-1">
              Call type: {mode}
            </p>
          </div>
        )}

        {/* LIVEKIT ROOM */}

        <div className="min-h-0 flex-1">
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={true}
            video={mode === "video"}
            onDisconnected={onLeave}
            onError={(error) => {
              console.error(
                "LiveKit connection error:",
                error
              );
            }}
            data-lk-theme="default"
            style={{
              height: "100%",
              width: "100%",
            }}
          >
            {mode === "video" ? (
              <VideoCallContent />
            ) : (
              <AudioCallContent />
            )}

            <RoomAudioRenderer />

            <ConnectionStateToast />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}
