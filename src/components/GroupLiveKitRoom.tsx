
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";

import "@livekit/components-styles";

interface GroupLiveKitRoomProps {
  token: string;
  serverUrl: string;
  mode: "audio" | "video";
  onLeave: () => void;
}

export default function GroupLiveKitRoom({
  token,
  serverUrl,
  mode,
  onLeave,
}: GroupLiveKitRoomProps) {
  return (
    <div className="h-[75vh] min-h-[400px] overflow-hidden rounded-2xl bg-zinc-950">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={mode === "video"}
        onDisconnected={onLeave}
        onError={(error) => {
          console.error("LiveKit error:", error);
        }}
        data-lk-theme="default"
        style={{ height: "100%" }}
      >
        {mode === "video" ? (
          <VideoConference />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-8 text-white">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">
                Group Audio Call
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Connected to your team conversation
              </p>
            </div>

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
        )}

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
