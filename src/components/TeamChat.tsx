
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
  Users,
  Plus,
  X,
  Phone,
  Video,
} from "lucide-react";

import CallPanel from "./CallPanel";
import LiveKitGroupCall from "././LiveKitGroupCall";

// TYPES

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
  type?: "direct" | "group";
  name?: string;
  description?: string;
  groupImage?: string;
  participants: Contact[];
  participantIds?: string[];
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

type GroupCallInfo = {
  callId: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  type: "audio" | "video";
  roomName?: string;
  participantIds?: string[];
  startedAt?: string;
};

type LiveKitCredentials = GroupCallInfo & {
  token: string;
  serverUrl: string;
  roomName: string;
};

const SOCKET_URL =
  "http://localhost:5001";

// ---------------------------------------------
// SOCKET REQUEST HELPER
// ---------------------------------------------

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

// ---------------------------------------------
// MESSAGE HELPERS
// ---------------------------------------------

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

// ---------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------

export default function TeamChat({
  token,
  currentUserId,
  title = "Team Messages",
}: Props) {
  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string | null>(null);
  const userIdRef = useRef(currentUserId);
  const historyGeneration = useRef(0);

  const typingTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Socket connection
  const [callSocket, setCallSocket] =
    useState<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  // Contacts and conversations
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  // Messages
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, ChatMessage[]>
  >({});

  const [hasMoreByChat, setHasMoreByChat] = useState<
    Record<string, boolean>
  >({});

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [loadingHistory, setLoadingHistory] =
    useState(false);

  const [typing, setTyping] =
    useState<string | null>(null);

  // Group creation
  const [showGroupForm, setShowGroupForm] =
    useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] =
    useState("");

  const [selectedMembers, setSelectedMembers] =
    useState<string[]>([]);

  const [creatingGroup, setCreatingGroup] =
    useState(false);

  // LiveKit group calls
  const [incomingGroupCall, setIncomingGroupCall] =
    useState<GroupCallInfo | null>(null);

  const [activeGroupCall, setActiveGroupCall] =
    useState<LiveKitCredentials | null>(null);

  const [groupCallBusy, setGroupCallBusy] =
    useState(false);

  const [availableGroupCalls, setAvailableGroupCalls] =
    useState<Record<string, GroupCallInfo>>({});

  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  // -------------------------------------------
  // REFRESH CONTACTS AND CONVERSATIONS
  // -------------------------------------------

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

  // -------------------------------------------
  // LOAD MESSAGE HISTORY
  // -------------------------------------------

  const loadHistory = useCallback(
    async (
      conversationId: string,
      before?: string
    ) => {
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

  // -------------------------------------------
  // SOCKET CONNECTION
  // -------------------------------------------

  useEffect(() => {
    if (!token && !currentUserId) return;

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
              person._id === data.userId && data.online
          )
            ? true
            : chat.online,
        }))
      );
    }

    // -----------------------------------------
    // GROUP CALL SOCKET EVENTS
    // -----------------------------------------

    function onGroupIncoming(data: GroupCallInfo) {
      setAvailableGroupCalls((previous) => ({
        ...previous,
        [data.conversationId]: data,
      }));

      setIncomingGroupCall((previous) =>
        previous || data
      );
    }

    function onGroupUpdated(data: GroupCallInfo) {
      setAvailableGroupCalls((previous) => ({
        ...previous,
        [data.conversationId]: data,
      }));
    }

    function onGroupEnded(data: {
      callId: string;
      conversationId: string;
      reason?: string;
    }) {
      setAvailableGroupCalls((previous) => {
        const next = { ...previous };

        if (
          next[data.conversationId]?.callId ===
          data.callId
        ) {
          delete next[data.conversationId];
        }

        return next;
      });

      setIncomingGroupCall((previous) =>
        previous?.callId === data.callId
          ? null
          : previous
      );

      setActiveGroupCall((previous) =>
        previous?.callId === data.callId
          ? null
          : previous
      );
    }

    function onConversationRemoved(data: {
      conversationId: string;
    }) {
      setConversations((previous) =>
        previous.filter(
          (chat) => chat._id !== data.conversationId
        )
      );

      if (activeRef.current === data.conversationId) {
        historyGeneration.current += 1;
        activeRef.current = null;
        setSelectedId(null);
        setTyping(null);
      }

      setAvailableGroupCalls((previous) => {
        const next = { ...previous };
        delete next[data.conversationId];
        return next;
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    socket.on(
      "conversations:changed",
      onConversations
    );

    socket.on("message:new", onMessage);
    socket.on("message:read", onRead);
    socket.on("typing:start", onTyping);
    socket.on("typing:stop", onTypingStop);
    socket.on("presence:changed", onPresence);

    socket.on(
      "group-call:incoming",
      onGroupIncoming
    );

    socket.on(
      "group-call:updated",
      onGroupUpdated
    );

    socket.on(
      "group-call:ended",
      onGroupEnded
    );

    socket.on(
      "conversation:removed",
      onConversationRemoved
    );

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);

      socket.off(
        "conversations:changed",
        onConversations
      );

      socket.off("message:new", onMessage);
      socket.off("message:read", onRead);
      socket.off("typing:start", onTyping);
      socket.off("typing:stop", onTypingStop);
      socket.off("presence:changed", onPresence);

      socket.off(
        "group-call:incoming",
        onGroupIncoming
      );

      socket.off(
        "group-call:updated",
        onGroupUpdated
      );

      socket.off(
        "group-call:ended",
        onGroupEnded
      );

      socket.off(
        "conversation:removed",
        onConversationRemoved
      );

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setCallSocket(null);

      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, [
    token,
    currentUserId,
    refresh,
    loadHistory,
  ]);

  // -------------------------------------------
  // SELECTED CONVERSATION
  // -------------------------------------------

  const selectedConversation = conversations.find(
    (chat) => chat._id === selectedId
  );

  const isGroup =
    selectedConversation?.type === "group";

  const other = selectedConversation?.participants.find(
    (person) => person._id !== currentUserId
  );

  const conversationName = isGroup
    ? selectedConversation?.name || "Group"
    : other?.name || "Conversation";

  const messages = selectedId
    ? messagesByChat[selectedId] || []
    : [];

  const selectedGroupCall = selectedId
    ? availableGroupCalls[selectedId]
    : undefined;

  // -------------------------------------------
  // CONTACT SORTING AND SEARCH
  // -------------------------------------------

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
        const chatA = conversations.find(
          (chat) =>
            chat.type !== "group" &&
            chat.participants.some(
              (person) => person._id === a._id
            )
        );

        const chatB = conversations.find(
          (chat) =>
            chat.type !== "group" &&
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

  const groupConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return conversations.filter(
      (chat) =>
        chat.type === "group" &&
        (
          (chat.name || "").toLowerCase().includes(term) ||
          (chat.description || "")
            .toLowerCase()
            .includes(term)
        )
    );
  }, [conversations, search]);

  // -------------------------------------------
  // OPEN A CONVERSATION
  // -------------------------------------------

  async function openConversation(id: string) {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setError("Messaging server is not connected.");
      return;
    }

    const previousId = activeRef.current;

    if (previousId && previousId !== id) {
      socket.emit(
        "conversation:leave",
        previousId
      );
    }

    historyGeneration.current += 1;
    activeRef.current = id;

    setSelectedId(id);
    setDraft("");
    setTyping(null);
    setLoadingHistory(false);
    setError("");

    socket.emit("conversation:join", id);

    await loadHistory(id);

    if (activeRef.current === id) {
      socket.emit("message:read", {
        conversationId: id,
      });
    }

    // Check whether this group has an active call.
    const conversation = conversations.find(
      (chat) => chat._id === id
    );

    if (conversation?.type === "group") {
      const result = await request<GroupCallInfo | null>(
        socket,
        "group-call:active",
        {
          conversationId: id,
        }
      );

      if (result.success) {
        setAvailableGroupCalls((previous) => {
          const next = { ...previous };

          if (result.data) {
            next[id] = result.data;
          } else {
            delete next[id];
          }

          return next;
        });
      }
    }
  }

  // -------------------------------------------
  // SELECT CONTACT
  // -------------------------------------------

  async function selectContact(contact: Contact) {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setError("Messaging server is not connected.");
      return;
    }

    const result = await request<{
      conversationId: string;
    }>(
      socket,
      "conversation:create",
      {
        userId: contact._id,
      }
    );

    if (
      !result.success ||
      !result.data?.conversationId
    ) {
      setError(
        result.message || "Cannot open conversation"
      );
      return;
    }

    void refresh(socket);

    await openConversation(result.data.conversationId);
  }

  // -------------------------------------------
  // CLOSE CONVERSATION
  // -------------------------------------------

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

  // -------------------------------------------
  // SEND MESSAGE
  // -------------------------------------------

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

      socket.emit(
        "typing:stop",
        conversationId
      );

      void refresh(socket);
    } else {
      setError(
        result.message || "Message was not sent"
      );
    }
  }

  // -------------------------------------------
  // TYPING INDICATOR
  // -------------------------------------------

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

  // -------------------------------------------
  // GROUP MEMBER SELECTION
  // -------------------------------------------

  function toggleMember(userId: string) {
    setSelectedMembers((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId]
    );
  }

  function closeGroupForm() {
    setShowGroupForm(false);
    setGroupName("");
    setGroupDescription("");
    setSelectedMembers([]);
  }

  // -------------------------------------------
  // CREATE GROUP
  // -------------------------------------------

  async function createGroup() {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setError("Messaging server is not connected.");
      return;
    }

    if (!groupName.trim()) {
      setError("Please enter a group name.");
      return;
    }

    if (!selectedMembers.length) {
      setError("Select at least one group member.");
      return;
    }

    setCreatingGroup(true);
    setError("");

    const result = await request<{
      conversationId: string;
    }>(
      socket,
      "group:create",
      {
        name: groupName.trim(),
        description: groupDescription.trim(),
        memberIds: selectedMembers,
      }
    );

    setCreatingGroup(false);

    if (
      !result.success ||
      !result.data?.conversationId
    ) {
      setError(
        result.message || "Unable to create group"
      );
      return;
    }

    const id = result.data.conversationId;

    closeGroupForm();

    await refresh(socket);
    await openConversation(id);
  }

  // -------------------------------------------
  // START LIVEKIT GROUP CALL
  // -------------------------------------------

  async function startGroupCall(
    type: "audio" | "video"
  ) {
    const socket = socketRef.current;

    if (
      !socket?.connected ||
      !selectedId ||
      !isGroup ||
      groupCallBusy ||
      activeGroupCall
    ) {
      return;
    }

    setGroupCallBusy(true);
    setError("");

    try {
      const result = await request<LiveKitCredentials>(
        socket,
        "group-call:start",
        {
          conversationId: selectedId,
          type,
        }
      );

      if (
        !result.success ||
        !result.data?.token
      ) {
        throw new Error(
          result.message || "Unable to start group call"
        );
      }

      setActiveGroupCall(result.data);

      setAvailableGroupCalls((previous) => ({
        ...previous,
        [result.data!.conversationId]: result.data!,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start call"
      );
    } finally {
      setGroupCallBusy(false);
    }
  }

  // -------------------------------------------
  // JOIN LIVEKIT GROUP CALL
  // -------------------------------------------

  async function joinGroupCall(
    callInfo: GroupCallInfo
  ) {
    const socket = socketRef.current;

    if (
      !socket?.connected ||
      groupCallBusy ||
      activeGroupCall
    ) {
      return;
    }

    setGroupCallBusy(true);
    setError("");

    try {
      const result = await request<LiveKitCredentials>(
        socket,
        "group-call:join",
        {
          callId: callInfo.callId,
        }
      );

      if (
        !result.success ||
        !result.data?.token
      ) {
        throw new Error(
          result.message || "Unable to join group call"
        );
      }

      setActiveGroupCall(result.data);
      setIncomingGroupCall(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to join call"
      );
    } finally {
      setGroupCallBusy(false);
    }
  }

  // -------------------------------------------
  // REJECT GROUP CALL INVITATION
  // -------------------------------------------

  async function rejectGroupCall() {
    const socket = socketRef.current;
    const incoming = incomingGroupCall;

    if (socket?.connected && incoming) {
      await request(
        socket,
        "group-call:reject",
        {
          callId: incoming.callId,
        }
      );
    }

    setIncomingGroupCall(null);
  }

  // -------------------------------------------
  // LEAVE LIVEKIT GROUP CALL
  // -------------------------------------------

  function leaveGroupCall() {
    const current = activeGroupCall;

    if (current) {
      socketRef.current?.emit(
        "group-call:leave",
        {
          callId: current.callId,
        }
      );
    }

    setActiveGroupCall(null);
  }

  // -------------------------------------------
  // SCROLL TO LATEST MESSAGE
  // -------------------------------------------

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
    });
  }, [selectedId, messages.length]);

  // -------------------------------------------
  // UI
  // -------------------------------------------

  return (
    <div className="space-y-5 text-gray-900 dark:text-white">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {title}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Chat and call your colleagues in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 text-xs ${
              connected
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {connected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Connected
              </>
            ) : (
              <>
                <WifiOff size={15} />
                Disconnected
              </>
            )}
          </span>

          <button
            type="button"
            onClick={() => {
              const socket = socketRef.current;

              if (socket?.connected) {
                void refresh(socket);
              }
            }}
            className="rounded-xl border border-gray-300 p-2 hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            title="Refresh contacts"
          >
            <RefreshCw size={18} />
          </button>

          <button
            type="button"
            onClick={() => setShowGroupForm(true)}
            disabled={!connected}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus size={17} />
            New Group
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {/* MAIN CHAT LAYOUT */}

      <div className="relative grid min-h-[650px] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-[300px_minmax(0,1fr)]">
        {/* SIDEBAR */}

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
                placeholder="Search colleagues or groups"
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-black dark:text-white"
              />
            </div>
          </div>

          <div className="max-h-[590px] flex-1 overflow-y-auto">
            {/* GROUP CONVERSATIONS */}

            {groupConversations.length > 0 && (
              <>
                <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Groups
                </p>

                {groupConversations.map((group) => (
                  <button
                    key={group._id}
                    type="button"
                    onClick={() =>
                      void openConversation(group._id)
                    }
                    className={`flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                      selectedId === group._id
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : ""
                    }`}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100">
                      <Users size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {group.name || "Group"}
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {group.lastMessage?.text ||
                          group.description ||
                          "Group conversation"}
                      </p>
                    </div>

                    {!!group.unreadCount && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
                        {group.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* DIRECT CONTACTS */}

            <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Colleagues
            </p>

            {sortedContacts.map((contact) => {
              const conversation = conversations.find(
                (chat) =>
                  chat.type !== "group" &&
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

            {!sortedContacts.length &&
              !groupConversations.length && (
                <p className="p-4 text-sm text-gray-500">
                  No colleagues or groups found.
                </p>
              )}
          </div>
        </aside>

        {/* CHAT CONTENT */}

        <section
          className={`min-w-0 flex-col ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-500">
              <MessageCircle size={38} />

              <p>
                Select a colleague or group to start chatting.
              </p>
            </div>
          ) : (
            <>
              {/* CONVERSATION HEADER */}

              <header className="flex items-center gap-3 border-b border-gray-200 py-4 pl-4 pr-28 dark:border-zinc-800">
                <button
                  type="button"
                  className="md:hidden"
                  onClick={closeConversation}
                  aria-label="Back to contacts"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                  {isGroup ? (
                    <Users size={20} />
                  ) : (
                    initials(other?.name || "Chat")
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {conversationName}
                  </p>

                  <p className="text-xs text-gray-500">
                    {typing
                      ? `${typing} is typing...`
                      : isGroup
                        ? `${selectedConversation?.participantIds?.length || selectedConversation?.participants.length || 0} members`
                        : other?.online
                          ? "Online"
                          : "Offline"}
                  </p>
                </div>
              </header>

              {/* ACTIVE GROUP CALL BANNER */}

              {isGroup && selectedGroupCall && (
                <div className="flex items-center justify-between gap-3 border-b border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/30">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    {selectedGroupCall.type === "video" ? (
                      <Video size={18} />
                    ) : (
                      <Phone size={18} />
                    )}

                    Group call in progress
                  </div>

                  <button
                    type="button"
                    disabled={
                      groupCallBusy ||
                      Boolean(activeGroupCall)
                    }
                    onClick={() =>
                      void joinGroupCall(selectedGroupCall)
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Join Call
                  </button>
                </div>
              )}

              {/* MESSAGE HISTORY */}

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

                  const read = mine && (
                    isGroup
                      ? (
                          selectedConversation?.participantIds ||
                          selectedConversation?.participants.map(
                            (person) => person._id
                          ) ||
                          []
                        )
                          .filter((id) => id !== currentUserId)
                          .every((id) =>
                            message.readBy.includes(id)
                          )
                      : Boolean(
                          other &&
                          message.readBy.includes(other._id)
                        )
                  );

                  const sender = isGroup
                    ? selectedConversation?.participants.find(
                        (person) =>
                          person._id === message.sender
                      )
                    : null;

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
                        {isGroup && !mine && (
                          <p className="mb-1 text-xs font-semibold text-indigo-500">
                            {sender?.name || "Team member"}
                          </p>
                        )}

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

              {/* MESSAGE INPUT */}

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

        {/* CALL CONTROLS */}

        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          {isGroup && selectedId ? (
            <>
              <button
                type="button"
                title="Group audio call"
                disabled={
                  !connected ||
                  groupCallBusy ||
                  Boolean(selectedGroupCall) ||
                  Boolean(activeGroupCall)
                }
                onClick={() =>
                  void startGroupCall("audio")
                }
                className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:hover:bg-zinc-800"
              >
                <Phone size={20} />
              </button>

              <button
                type="button"
                title="Group video call"
                disabled={
                  !connected ||
                  groupCallBusy ||
                  Boolean(selectedGroupCall) ||
                  Boolean(activeGroupCall)
                }
                onClick={() =>
                  void startGroupCall("video")
                }
                className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:hover:bg-zinc-800"
              >
                <Video size={20} />
              </button>
            </>
          ) : null}

          {/* Keep CallPanel mounted to receive
              incoming one-to-one calls. */}

          <CallPanel
            socket={callSocket}
            conversationId={
              selectedId && !isGroup
                ? selectedId
                : null
            }
            contactName={other?.name}
          />
        </div>
      </div>

      {/* CREATE GROUP MODAL */}

      {showGroupForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Create Group
              </h2>

              <button
                type="button"
                onClick={closeGroupForm}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Group Name
                </label>

                <input
                  value={groupName}
                  maxLength={100}
                  onChange={(event) =>
                    setGroupName(event.target.value)
                  }
                  placeholder="Enter group name"
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-black dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={groupDescription}
                  maxLength={500}
                  onChange={(event) =>
                    setGroupDescription(event.target.value)
                  }
                  placeholder="Optional group description"
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-black dark:text-white"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  Select Members ({selectedMembers.length})
                </p>

                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-zinc-700">
                  {contacts.map((contact) => (
                    <label
                      key={contact._id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(
                          contact._id
                        )}
                        onChange={() =>
                          toggleMember(contact._id)
                        }
                        className="h-4 w-4 accent-indigo-600"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {contact.name}
                        </p>

                        <p className="truncate text-xs text-gray-500">
                          {contact.email}
                        </p>
                      </div>
                    </label>
                  ))}

                  {!contacts.length && (
                    <p className="p-3 text-sm text-gray-500">
                      No contacts available.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeGroupForm}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-zinc-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    creatingGroup ||
                    !groupName.trim() ||
                    !selectedMembers.length
                  }
                  onClick={() => void createGroup()}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {creatingGroup
                    ? "Creating..."
                    : "Create Group"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING GROUP CALL */}

      {incomingGroupCall && !activeGroupCall && (
        <div className="fixed bottom-5 right-5 z-[110] w-[min(350px,calc(100vw-40px))] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              {incomingGroupCall.type === "video" ? (
                <Video size={24} />
              ) : (
                <Phone size={24} />
              )}
            </div>

            <div>
              <h3 className="font-semibold">
                Incoming Group Call
              </h3>

              <p className="text-sm text-gray-500">
                {incomingGroupCall.callerName}
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-500">
            {incomingGroupCall.type === "video"
              ? "You are invited to a group video call."
              : "You are invited to a group audio call."}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={groupCallBusy}
              onClick={() =>
                void joinGroupCall(incomingGroupCall)
              }
              className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Join
            </button>

            <button
              type="button"
              onClick={() => void rejectGroupCall()}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* LIVEKIT GROUP CALL WINDOW */}

      {activeGroupCall && (
        <LiveKitGroupCall
          token={activeGroupCall.token}
          serverUrl={activeGroupCall.serverUrl}
          mode={activeGroupCall.type}
          roomName={activeGroupCall.roomName}
          onLeave={leaveGroupCall}
        />
      )}
    </div>
  );
}
