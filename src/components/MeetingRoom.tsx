
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";

import {
  RoomEvent,
} from "livekit-client";

import "@livekit/components-styles";

type MeetingMessage = {
  id: string;
  sender: string;
  text: string;
  type: "chat" | "reaction";
  createdAt: number;
};

interface MeetingRoomProps {
  token: string;
  serverUrl: string;
  onLeave: () => void;
}

const REACTIONS = [
  "👍", "❤️", "😂", "👏", "🎉", "✋",
];

const quickReplies = [
  "Yes, I agree.",
  "Thank you!",
  "Could you explain that?",
  "I'll check and update you.",
];

function MeetingSidebar() {
  const room = useRoomContext();

  const [messages, setMessages] =
    useState<MeetingMessage[]>([]);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);

  const onData = useCallback(
    (
      payload: Uint8Array,
      participant?: {
        name?: string;
        identity: string;
      }
    ) => {
      try {
        const value = JSON.parse(
          new TextDecoder().decode(payload)
        );

        if (
          value.type !== "chat" &&
          value.type !== "reaction"
        ) {
          return;
        }

        if (typeof value.text !== "string") {
          return;
        }

        setMessages((previous) => [
          ...previous,
          {
            id: crypto.randomUUID(),
            sender:
              participant?.name ||
              participant?.identity ||
              "Participant",
            text: value.text.slice(0, 2000),
            type: value.type,
            createdAt: Date.now(),
          },
        ]);
      } catch {
        // Ignore malformed meeting data.
      }
    },
    []
  );

  useEffect(() => {
    room.on(RoomEvent.DataReceived, onData);

    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, onData]);

  const send = async (
    message: string,
    type: "chat" | "reaction"
  ) => {
    const content = message.trim();

    if (!content || sending) return;

    setSending(true);
    setError("");

    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          type,
          text: content.slice(0, 2000),
        })
      );

      await room.localParticipant.publishData(
        payload,
        {
          reliable: true,
          topic: "meeting-messages",
        }
      );

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          sender: "You",
          text: content,
          type,
          createdAt: Date.now(),
        },
      ]);

      if (type === "chat") {
        setText("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send meeting message."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-700 bg-zinc-900 text-white">
      <div className="border-b border-zinc-700 p-4">
        <h3 className="font-semibold">
          Meeting chat & reactions
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          Chat with everyone in this meeting
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-400">
            No messages yet. Say hello!
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg bg-zinc-800 p-3 text-sm"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-indigo-300">
                {message.sender}
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(
                  message.createdAt
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="break-words">
              {message.text}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-700 p-3">
        <p className="mb-2 text-xs text-zinc-400">
          Quick reactions
        </p>

        <div className="flex flex-wrap gap-2">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() =>
                void send(emoji, "reaction")
              }
              title={`Send ${emoji}`}
              className="rounded-lg bg-zinc-800 p-2 text-xl transition hover:bg-zinc-700"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-700 p-3">
        <p className="mb-2 text-xs text-zinc-400">
          Suggested replies
        </p>

        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => setText(reply)}
              className="rounded-full border border-indigo-700 bg-indigo-950 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-900"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="px-3 text-xs text-red-400">
          {error}
        </p>
      )}

      <form
        className="border-t border-zinc-700 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text, "chat");
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setShowEmojiPicker((previous) => !previous)
            }
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
          >
            😊 Emoji
          </button>
        </div>

        {showEmojiPicker && (
          <div className="mb-3 grid grid-cols-6 gap-2 rounded-lg bg-zinc-800 p-3">
            {[
              "😀", "😊", "😂", "😍", "👍", "❤️",
              "👏", "🎉", "🙏", "🔥", "💯", "👋",
            ].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setText((previous) => previous + emoji);
                  setShowEmojiPicker(false);
                }}
                className="rounded p-1 text-xl hover:bg-zinc-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            placeholder="Message everyone..."
            maxLength={2000}
            className="min-w-0 flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}

export default function MeetingRoom({
  token,
  serverUrl,
  onLeave,
}: MeetingRoomProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 p-3">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={onLeave}
        onError={(error) => {
          console.error(
            "LiveKit meeting error:",
            error
          );
        }}
        data-lk-theme="default"
        className="h-full"
      >
        <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-hidden rounded-xl bg-black">
            <VideoConference />
          </div>

          <div className="min-h-0 overflow-hidden">
            <MeetingSidebar />
          </div>
        </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
