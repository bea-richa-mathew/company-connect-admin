
import { useMemo, useState } from "react";

interface SmartComposerToolsProps {
  draft: string;
  latestIncoming?: string;
  onChange: (value: string) => void;
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅",
  "😂", "🤣", "😊", "😍", "🥰", "😘",
  "😎", "🤔", "😮", "😢", "😭", "😡",
  "👍", "👎", "👏", "🙌", "🙏", "🤝",
  "❤️", "💙", "💚", "💯", "🔥", "⭐",
  "🎉", "🥳", "🎂", "🎁", "💡", "🚀",
  "👋", "✋", "👌", "✅", "❌", "📌",
  "📅", "💻", "📞", "📷", "🎤", "💬",
];

function getSuggestedReplies(
  incoming: string
): string[] {
  const text = incoming.toLowerCase().trim();

  if (!text) return [];

  if (/\b(hi|hello|hey)\b/.test(text)) {
    return [
      "Hi! How are you?",
      "Hello! How can I help?",
      "Hey! Good to hear from you 😊",
    ];
  }

  if (
    /\b(good morning|good afternoon|good evening)\b/.test(
      text
    )
  ) {
    return [
      "Good morning! 😊",
      "Hope you're doing well!",
      "Hello! Have a great day!",
    ];
  }

  if (/\b(thanks|thank you)\b/.test(text)) {
    return [
      "You're welcome!",
      "Happy to help 😊",
      "Anytime!",
    ];
  }

  if (/\b(meeting|call|join)\b/.test(text)) {
    return [
      "Sure, I'll join.",
      "What time is the meeting?",
      "Please share the meeting details.",
    ];
  }

  if (/\b(task|project|update|report)\b/.test(text)) {
    return [
      "I'll check and update you.",
      "Thanks for the update.",
      "Could you share more details?",
    ];
  }

  if (/\b(done|completed|finished)\b/.test(text)) {
    return [
      "Great work! 🎉",
      "Thanks for completing it.",
      "Perfect, noted.",
    ];
  }

  if (text.includes("?")) {
    return [
      "Sure, let me check.",
      "Yes, that works for me.",
      "Could you clarify that?",
    ];
  }

  return [
    "Okay, noted.",
    "Thanks for letting me know.",
    "I'll get back to you shortly.",
  ];
}

export default function SmartComposerTools({
  draft,
  latestIncoming = "",
  onChange,
}: SmartComposerToolsProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] =
    useState(true);
  const [emojiSearch, setEmojiSearch] = useState("");

  const suggestions = useMemo(
    () => getSuggestedReplies(latestIncoming),
    [latestIncoming]
  );

  const filteredEmojis = useMemo(() => {
    const search = emojiSearch.trim().toLowerCase();

    if (!search) return EMOJIS;

    const groups: Record<string, string[]> = {
      happy: ["😀", "😃", "😄", "😊", "😁"],
      smile: ["😀", "😃", "😊", "😄"],
      laugh: ["😂", "🤣", "😆"],
      love: ["❤️", "😍", "🥰", "😘"],
      sad: ["😢", "😭"],
      angry: ["😡"],
      hand: ["👋", "✋", "👏", "🙌", "👌"],
      thanks: ["🙏", "❤️"],
      like: ["👍", "❤️"],
      party: ["🎉", "🥳", "🎁"],
      work: ["💻", "📅", "📌", "💡"],
    };

    return groups[search] ?? [];
  }, [emojiSearch]);

  const insertEmoji = (emoji: string) => {
    onChange(draft + emoji);
  };

  const tidyText = () => {
    const text = draft.trim().replace(/\s+/g, " ");

    if (!text) return;

    onChange(
      text.charAt(0).toUpperCase() + text.slice(1)
    );
  };

  return (
    <div className="relative border-t border-gray-200 bg-white px-4 py-3 text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
      {showSuggestions &&
        latestIncoming &&
        !draft.trim() && (
          <div className="mb-3">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              💡 Suggested replies
            </p>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => onChange(reply)}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setEmojiOpen((previous) => !previous)
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          😊 Emoji
        </button>

        <button
          type="button"
          onClick={() =>
            setShowSuggestions((previous) => !previous)
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          💡 {showSuggestions ? "Hide replies" : "Show replies"}
        </button>

        <button
          type="button"
          onClick={tidyText}
          disabled={!draft.trim()}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ✨ Improve text
        </button>
      </div>

      {emojiOpen && (
        <div className="absolute bottom-full left-2 z-50 mb-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <strong className="text-sm">
              Choose an emoji
            </strong>

            <button
              type="button"
              onClick={() => setEmojiOpen(false)}
              aria-label="Close emoji picker"
            >
              ✕
            </button>
          </div>

          <input
            value={emojiSearch}
            onChange={(event) =>
              setEmojiSearch(event.target.value)
            }
            placeholder="Search: happy, love, party..."
            className="mb-3 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />

          <div className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  insertEmoji(emoji);
                  setEmojiOpen(false);
                }}
                className="rounded-lg p-2 text-xl hover:bg-gray-100 dark:hover:bg-zinc-700"
              >
                {emoji}
              </button>
            ))}
          </div>

          {filteredEmojis.length === 0 && (
            <p className="text-sm text-gray-500">
              No matching emojis.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
