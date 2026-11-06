
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { io, type Socket } from "socket.io-client";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  WifiOff,
} from "lucide-react";

import CallPanel from "./CallPanel";

type Contact = {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  online?: boolean;
};

type ChatMessage = {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  readBy: string[];
  createdAt: string;
};

type Conversation = {
  _id: string;
  participants: Contact[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  online: boolean;
};

type Result<T> = {
  success: boolean;
  data?: T;
  message?: string;
  hasMore?: boolean;
};

type Props = {
  token: string | null;
  currentUserId: string | null;
  title?: string;
};

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5001";

function request<T>(
  socket: Socket,
  event: string,
  payload?: unknown
): Promise<Result<T>> {
  return new Promise((resolve) => {
    const callback = (
      error: Error | null,
      result?: Result<T>
    ) => {
      resolve(
        error
          ? {
              success: false,
              message: "Socket request timed out",
            }
          : result || {
              success: false,
              message: "Empty server response",
            }
      );
    };

    if (payload === undefined) {
      socket.timeout(12000).emit(event, callback);
    } else {
      socket.timeout(12000).emit(
        event,
        payload,
        callback
      );
    }
  });
}

function mergeMessages(
  previous: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  for (const message of previous) {
    map.set(message._id, message);
  }

  for (const message of incoming) {
    const existing = map.get(message._id);

    map.set(message._id, {
      ...existing,
      ...message,
      readBy: Array.from(
        new Set([
          ...(existing?.readBy || []),
          ...(message.readBy || []),
        ])
      ),
    });
  }

  return [...map.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) ||
      a._id.localeCompare(b._id)
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TeamChat({
  token,
  currentUserId,
  title = "Team Messages",
}: Props) {
  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string | null>(null);
  const historyGeneration = useRef(0);

  const typingTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  const bottomRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef(currentUserId);

  // This state makes the Socket.IO instance
  // available to the CallPanel component.
  const [callSocket, setCallSocket] =
    useState<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, ChatMessage[]>
  >({});

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [loadingHistory, setLoadingHistory] =
    useState(false);

  const [hasMoreByChat, setHasMoreByChat] = useState<
    Record<string, boolean>
  >({});

  const [typing, setTyping] =
    useState<string | null>(null);

  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  const refresh = useCallback(async (socket: Socket) => {
    const [people, chats] = await Promise.all([
      request<Contact[]>(socket, "contacts:list"),
      request<Conversation[]>(
        socket,
        "conversations:list"
      ),
    ]);

    if (people.success) {
      setContacts(people.data || []);
    } else {
      setError(
        people.message || "Cannot load contacts"
      );
    }

    if (chats.success) {
      setConversations(chats.data || []);
    } else {
      setError(
        chats.message || "Cannot load conversations"
      );
    }
  }, []);

  const loadHistory = useCallback(
    async (conversationId: string, before?: string) => {
      const socket = socketRef.current;

      if (!socket?.connected) return;

      const generation = historyGeneration.current;

      setLoadingHistory(true);

      const result = await request<ChatMessage[]>(
        socket,
        "message:history",
        {
          conversationId,
          before,
          limit: 30,
        }
      );

      if (
        generation !== historyGeneration.current ||
        activeRef.current !== conversationId
      ) {
        return;
      }

      if (result.success) {
        setMessagesByChat((previous) => ({
          ...previous,
          [conversationId]: mergeMessages(
            previous[conversationId] || [],
            result.data || []
          ),
        }));

        setHasMoreByChat((previous) => ({
          ...previous,
          [conversationId]: Boolean(result.hasMore),
        }));
      } else {
        setError(
          result.message || "Cannot load messages"
        );
      }

      setLoadingHistory(false);
    },
    []
  );

  useEffect(() => {
    // Employee: JWT token
    // Admin: HttpOnly session cookie
    if (!token && !currentUserId) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: token ? { token } : {},
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;
    setCallSocket(socket);

    function onConnect() {
      setConnected(true);
      setError("");

      void refresh(socket);

      const active = activeRef.current;

      if (active) {
        socket.emit("conversation:join", active);
        void loadHistory(active);
      }
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onError(err: Error) {
      setConnected(false);
      setError(err.message);
    }

    function onConversations(data: unknown) {
      if (Array.isArray(data)) {
        setConversations(data as Conversation[]);
      } else {
        void refresh(socket);
      }
    }

    function onMessage(message: ChatMessage) {
      setMessagesByChat((previous) => ({
        ...previous,
        [message.conversationId]: mergeMessages(
          previous[message.conversationId] || [],
          [message]
        ),
      }));

      if (
        activeRef.current === message.conversationId &&
        message.sender !== userIdRef.current
      ) {
        socket.emit("message:read", {
          conversationId: message.conversationId,
        });
      }

      void refresh(socket);
    }

    function onRead(data: {
      conversationId: string;
      userId: string;
    }) {
      setMessagesByChat((previous) => ({
        ...previous,
        [data.conversationId]: (
          previous[data.conversationId] || []
        ).map((message) => ({
          ...message,
          readBy: message.readBy.includes(data.userId)
            ? message.readBy
            : [...message.readBy, data.userId],
        })),
      }));
    }

    function onTyping(data: {
      conversationId: string;
      name: string;
    }) {
      if (activeRef.current === data.conversationId) {
        setTyping(data.name);
      }
    }

    function onTypingStop(data: {
      conversationId: string;
    }) {
      if (activeRef.current === data.conversationId) {
        setTyping(null);
      }
    }

    function onPresence(data: {
      userId: string;
      online: boolean;
    }) {
      setContacts((previous) =>
        previous.map((person) =>
          person._id === data.userId
            ? { ...person, online: data.online }
            : person
        )
      );

      setConversations((previous) =>
        previous.map((chat) => ({
          ...chat,
          participants: chat.participants.map((person) =>
            person._id === data.userId
              ? { ...person, online: data.online }
              : person
          ),
          online: chat.participants.some(
            (person) =>
              person._id === data.userId &&
              data.online
          )
            ? true
            : chat.online,
        }))
      );
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    socket.on("conversations:changed", onConversations);
    socket.on("message:new", onMessage);
    socket.on("message:read", onRead);

    socket.on("typing:start", onTyping);
    socket.on("typing:stop", onTypingStop);

    socket.on("presence:changed", onPresence);

    return () => {
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setCallSocket(null);

      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, [token, currentUserId, refresh, loadHistory]);

  const selectedConversation = conversations.find(
    (chat) => chat._id === selectedId
  );

  const other = selectedConversation?.participants.find(
    (person) => person._id !== currentUserId
  );

  const messages = selectedId
    ? messagesByChat[selectedId] || []
    : [];

  const sortedContacts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contacts
      .filter((contact) =>
        [
          contact.name,
          contact.email,
          contact.role,
          contact.department || "",
        ].some((value) =>
          value.toLowerCase().includes(term)
        )
      )
      .sort((a, b) => {
        const chatA = conversations.find((chat) =>
          chat.participants.some(
            (person) => person._id === a._id
          )
        );

        const chatB = conversations.find((chat) =>
          chat.participants.some(
            (person) => person._id === b._id
          )
        );

        return (
          (
            chatB?.lastMessage?.createdAt || ""
          ).localeCompare(
            chatA?.lastMessage?.createdAt || ""
          ) || a.name.localeCompare(b.name)
        );
      });
  }, [contacts, conversations, search]);

  async function selectContact(contact: Contact) {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setError("Messaging server is not connected.");
      return;
    }

    const result = await request<{
      conversationId: string;
    }>(socket, "conversation:create", {
      userId: contact._id,
    });

    if (!result.success || !result.data?.conversationId) {
      setError(
        result.message || "Cannot open conversation"
      );
      return;
    }

    const id = result.data.conversationId;
    const previousId = activeRef.current;

    if (previousId && previousId !== id) {
      socket.emit("conversation:leave", previousId);
    }

    historyGeneration.current += 1;
    activeRef.current = id;

    setSelectedId(id);
    setDraft("");
    setTyping(null);
    setLoadingHistory(false);
    setError("");

    socket.emit("conversation:join", id);

    void refresh(socket);

    await loadHistory(id);

    if (activeRef.current === id) {
      socket.emit("message:read", {
        conversationId: id,
      });
    }
  }

  function closeConversation() {
    if (activeRef.current) {
      socketRef.current?.emit(
        "conversation:leave",
        activeRef.current
      );
    }

    historyGeneration.current += 1;
    activeRef.current = null;

    setSelectedId(null);
    setTyping(null);
    setLoadingHistory(false);
  }

  async function sendMessage() {
    const socket = socketRef.current;
    const conversationId = activeRef.current;
    const text = draft.trim();

    if (
      !socket?.connected ||
      !conversationId ||
      !text ||
      sending
    ) {
      return;
    }

    setSending(true);

    const result = await request<ChatMessage>(
      socket,
      "message:send",
      {
        conversationId,
        text,
      }
    );

    setSending(false);

    if (result.success && result.data) {
      const sentMessage = result.data;

      setMessagesByChat((previous) => ({
        ...previous,
        [conversationId]: mergeMessages(
          previous[conversationId] || [],
          [sentMessage]
        ),
      }));

      setDraft((previous) =>
        previous === text ? "" : previous
      );

      socket.emit("typing:stop", conversationId);
      void refresh(socket);
    } else {
      setError(
        result.message || "Message was not sent"
      );
    }
  }

  function updateDraft(value: string) {
    setDraft(value);

    const conversationId = activeRef.current;

    if (!conversationId) return;

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    if (value.trim()) {
      socketRef.current?.emit(
        "typing:start",
        conversationId
      );
    } else {
      socketRef.current?.emit(
        "typing:stop",
        conversationId
      );
    }

    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit(
        "typing:stop",
        conversationId
      );
    }, 1200);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
    });
  }, [selectedId, messages.length]);

  return (
    <div className="space-y-5 text-gray-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {title}
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Real-time messages between team members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {connected ? (
            <span className="text-sm text-green-600">
              ● Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-red-500">
              <WifiOff size={16} />
              Offline
            </span>
          )}

          <button
            type="button"
            title="Refresh conversations"
            onClick={() => {
              const socket = socketRef.current;

              if (socket?.connected) {
                void refresh(socket);

                if (activeRef.current) {
                  void loadHistory(activeRef.current);
                }
              }
            }}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={`flex-col border-r border-gray-200 dark:border-zinc-800 ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-gray-200 p-4 dark:border-zinc-800">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-3 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search colleagues"
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-black dark:text-white"
              />
            </div>
          </div>

          <div className="max-h-[590px] flex-1 overflow-y-auto">
            {sortedContacts.map((contact) => {
              const conversation = conversations.find(
                (chat) =>
                  chat.participants.some(
                    (person) =>
                      person._id === contact._id
                  )
              );

              return (
                <button
                  key={contact._id}
                  type="button"
                  onClick={() =>
                    void selectContact(contact)
                  }
                  className={`flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                    conversation?._id === selectedId
                      ? "bg-indigo-50 dark:bg-indigo-950/30"
                      : ""
                  }`}
                >
                  <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100">
                    {initials(contact.name)}

                    {contact.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {contact.name}
                    </p>

                    <p className="text-xs capitalize text-gray-500">
                      {contact.role}

                      {contact.department
                        ? ` · ${contact.department}`
                        : ""}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {conversation?.lastMessage?.text ||
                        contact.email}
                    </p>
                  </div>

                  {!!conversation?.unreadCount && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}

            {!sortedContacts.length && (
              <p className="p-4 text-sm text-gray-500">
                No colleagues found.
              </p>
            )}
          </div>
        </aside>

        <section
          className={`min-w-0 flex-col ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-500">
              <MessageCircle size={38} />
              <p>Select a colleague to start chatting.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-zinc-800">
                <button
                  type="button"
                  className="md:hidden"
                  onClick={closeConversation}
                  aria-label="Back to contacts"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                  {initials(other?.name || "Chat")}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {other?.name || "Conversation"}
                  </p>

                  <p className="text-xs text-gray-500">
                    {typing
                      ? `${typing} is typing...`
                      : other?.online
                        ? "Online"
                        : "Offline"}
                  </p>
                </div>
              </header>

              <div className="max-h-[550px] min-h-[460px] flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-black">
                {selectedId &&
                  hasMoreByChat[selectedId] &&
                  messages.length > 0 && (
                    <button
                      type="button"
                      disabled={loadingHistory}
                      onClick={() =>
                        void loadHistory(
                          selectedId,
                          messages[0]._id
                        )
                      }
                      className="mx-auto block rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-zinc-700"
                    >
                      Load older messages
                    </button>
                  )}

                {loadingHistory && (
                  <p className="text-center text-xs text-gray-500">
                    Loading messages...
                  </p>
                )}

                {messages.map((message) => {
                  const mine =
                    message.sender === currentUserId;

                  const read =
                    mine &&
                    !!other &&
                    message.readBy.includes(other._id);

                  return (
                    <div
                      key={message._id}
                      className={`flex ${
                        mine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          mine
                            ? "bg-indigo-600 text-white"
                            : "border border-gray-200 bg-white text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.text}
                        </p>

                        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-75">
                          {formatTime(message.createdAt)}

                          {mine &&
                            (read ? (
                              <CheckCheck
                                size={14}
                                aria-label="Read"
                              />
                            ) : (
                              <Check
                                size={14}
                                aria-label="Sent"
                              />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!messages.length &&
                  !loadingHistory && (
                    <p className="py-20 text-center text-sm text-gray-500">
                      No messages yet. Say hello!
                    </p>
                  )}

                <div ref={bottomRef} />
              </div>

              <div className="flex items-end gap-2 border-t border-gray-200 p-4 dark:border-zinc-800">
                <textarea
                  rows={2}
                  maxLength={5000}
                  value={draft}
                  onChange={(event) =>
                    updateDraft(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Write a message..."
                  className="min-w-0 flex-1 resize-none rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 dark:border-zinc-700 dark:bg-black dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={
                    !connected ||
                    sending ||
                    !draft.trim()
                  }
                  className="rounded-xl bg-indigo-600 p-3 text-white disabled:opacity-50"
                  title="Send message"
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Keep exactly one CallPanel mounted.
          This allows incoming calls even when no
          conversation is currently selected. */}
      <div className="flex justify-end">
        <CallPanel
          socket={callSocket}
          conversationId={selectedId}
          contactName={other?.name}
        />
      </div>
    </div>
  );
}
