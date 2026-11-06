
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import {
  Circle,
  Download,
  Maximize,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  PhoneOff,
  Square,
  Video,
  VideoOff,
} from "lucide-react";

type CallType = "audio" | "video";

type CallInfo = {
  callId: string;
  conversationId: string;
  callerId?: string;
  callerName?: string;
  type: CallType;
};

type Signal =
  | {
      type: "offer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "answer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "candidate";
      candidate: RTCIceCandidateInit;
    };

type Status =
  | "idle"
  | "incoming"
  | "calling"
  | "connecting"
  | "active";

type Props = {
  socket: Socket | null;
  conversationId: string | null;
  contactName?: string;
};

type Reaction = {
  id: string;
  emoji: string;
  sender: string;
};

type Ack = {
  success: boolean;
  message?: string;
  data?: {
    callId: string;
  };
};

const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const REACTIONS = [
  "👍",
  "❤️",
  "😂",
  "👏",
  "🎉",
  "✋",
  "😊",
  "🔥",
];

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function chooseMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  return [
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "audio/webm;codecs=opus",
    "audio/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

export default function CallPanel({
  socket,
  conversationId,
  contactName,
}: Props) {
  const [call, setCall] = useState<CallInfo | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [recording, setRecording] = useState(false);
  const [recordingRequested, setRecordingRequested] =
    useState(false);
  const [recordingApproved, setRecordingApproved] =
    useState(false);
  const [recordingPending, setRecordingPending] =
    useState(false);
  const [remoteRecording, setRemoteRecording] =
    useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");

  const [reactions, setReactions] = useState<Reaction[]>([]);

  const [localDisplay, setLocalDisplay] =
    useState<MediaStream | null>(null);
  const [remoteDisplay, setRemoteDisplay] =
    useState<MediaStream | null>(null);

  const callRef = useRef<CallInfo | null>(null);
  const statusRef = useRef<Status>("idle");

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);

  const pendingRef = useRef<RTCIceCandidateInit[]>([]);
  const startingRef = useRef(false);

  const preparingRef = useRef<
    Promise<RTCPeerConnection> | undefined
  >(undefined);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(
    null
  );
  const audioContextRef = useRef<AudioContext | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(
    null
  );
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordUrlRef = useRef("");

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const callWindow = useRef<HTMLDivElement>(null);

  const setCallStatus = useCallback((value: Status) => {
    statusRef.current = value;
    setStatus(value);
  }, []);

  const setCurrentCall = useCallback(
    (value: CallInfo | null) => {
      callRef.current = value;
      setCall(value);
    },
    []
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (err) {
        console.error("Recorder stop failed:", err);
      }
    }

    setRecording(false);
  }, []);

  const releaseRecordingResources = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    recordingStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    recordingStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    canvasRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopRecording();

    peerRef.current?.close();
    peerRef.current = null;
    preparingRef.current = undefined;

    localRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    screenRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    localRef.current = null;
    remoteRef.current = null;
    screenRef.current = null;
    pendingRef.current = [];

    setLocalDisplay(null);
    setRemoteDisplay(null);
    setCurrentCall(null);
    setCallStatus("idle");

    setMuted(false);
    setCameraOff(false);
    setSharing(false);

    setRecordingRequested(false);
    setRecordingApproved(false);
    setRecordingPending(false);
    setRemoteRecording(false);
    setReactions([]);

    startingRef.current = false;
  }, [
    stopRecording,
    setCurrentCall,
    setCallStatus,
  ]);

  const endCall = useCallback(() => {
    const current = callRef.current;

    if (current && socket?.connected) {
      socket.emit("call:end", {
        callId: current.callId,
      });
    }

    cleanup();
  }, [socket, cleanup]);

  const preparePeer = useCallback(
    (current: CallInfo) => {
      if (peerRef.current) {
        return Promise.resolve(peerRef.current);
      }

      if (preparingRef.current) {
        return preparingRef.current;
      }

      const task = (async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera and microphone require HTTPS or localhost."
          );
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: current.type === "video",
          });

        if (
          callRef.current?.callId !== current.callId
        ) {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          throw new Error("Call was cancelled.");
        }

        localRef.current = stream;
        setLocalDisplay(stream);

        const peer = new RTCPeerConnection(rtcConfig);
        peerRef.current = peer;

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        if (current.type === "audio") {
          peer.addTransceiver("video", {
            direction: "sendrecv",
          });
        }

        peer.ontrack = (event) => {
          const incoming =
            event.streams[0] ||
            new MediaStream([event.track]);

          if (
            remoteRef.current &&
            remoteRef.current !== incoming &&
            !event.streams.length
          ) {
            remoteRef.current.addTrack(event.track);
            setRemoteDisplay(
              new MediaStream(
                remoteRef.current.getTracks()
              )
            );
          } else {
            remoteRef.current = incoming;
            setRemoteDisplay(incoming);
          }
        };

        peer.onicecandidate = (event) => {
          if (
            !event.candidate ||
            !socket?.connected
          ) {
            return;
          }

          socket.emit("call:signal", {
            callId: current.callId,
            signal: {
              type: "candidate",
              candidate: event.candidate.toJSON(),
            },
          });
        };

        peer.onconnectionstatechange = () => {
          if (peer.connectionState === "connected") {
            setCallStatus("active");
          }

          if (peer.connectionState === "failed") {
            setError("Media connection failed.");
            endCall();
          }
        };

        return peer;
      })();

      preparingRef.current = task;

      void task
        .finally(() => {
          if (preparingRef.current === task) {
            preparingRef.current = undefined;
          }
        })
        .catch(() => {});

      return task;
    },
    [socket, endCall, setCallStatus]
  );

  const startCall = async (type: CallType) => {
    if (
      !socket?.connected ||
      !conversationId ||
      callRef.current ||
      startingRef.current
    ) {
      return;
    }

    startingRef.current = true;
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Use HTTPS or localhost to make calls."
        );
      }

      const response = (await socket
        .timeout(12000)
        .emitWithAck("call:start", {
          conversationId,
          type,
        })) as Ack;

      if (!response?.success || !response.data) {
        throw new Error(
          response?.message || "Unable to start call."
        );
      }

      setCurrentCall({
        callId: response.data.callId,
        conversationId,
        callerName: contactName,
        type,
      });

      setCallStatus("calling");
    } catch (err) {
      setError(getError(err));
    } finally {
      startingRef.current = false;
    }
  };

  const acceptCall = async () => {
    const current = callRef.current;
    if (!current || !socket) return;

    setCallStatus("connecting");
    setError("");

    try {
      await preparePeer(current);

      const response = (await socket
        .timeout(12000)
        .emitWithAck("call:accept", {
          callId: current.callId,
        })) as Ack;

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to accept call."
        );
      }
    } catch (err) {
      setError(getError(err));
      endCall();
    }
  };

  const rejectCall = () => {
    const current = callRef.current;

    if (current) {
      socket?.emit("call:reject", {
        callId: current.callId,
      });
    }

    cleanup();
  };

  const toggleMute = () => {
    const next = !muted;

    localRef.current
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = !next;
      });

    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;

    localRef.current
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = !next;
      });

    setCameraOff(next);
  };

  const stopSharing = useCallback(async () => {
    const peer = peerRef.current;

    const original =
      localRef.current?.getVideoTracks()[0] || null;

    const sender = peer
      ?.getSenders()
      .find(
        (item) =>
          item.track?.kind === "video"
      );

    if (sender) {
      await sender.replaceTrack(original);
    }

    screenRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    screenRef.current = null;
    setSharing(false);

    setLocalDisplay(localRef.current);
  }, []);

  const startSharing = async () => {
    if (
      !peerRef.current ||
      statusRef.current !== "active"
    ) {
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

      const track = stream.getVideoTracks()[0];

      if (!track) {
        throw new Error("No screen selected.");
      }

      const sender = peerRef.current
        .getSenders()
        .find(
          (item) =>
            item.track?.kind === "video"
        );

      if (!sender) {
        stream
          .getTracks()
          .forEach((item) => item.stop());

        throw new Error(
          "Screen sharing sender is unavailable."
        );
      }

      await sender.replaceTrack(track);

      screenRef.current = stream;
      setLocalDisplay(stream);
      setSharing(true);

      track.onended = () => {
        void stopSharing();
      };
    } catch (err) {
      setError(getError(err));
    }
  };

  // Create a single recording stream containing
  // mixed audio and a composite video layout.
  const createRecordingStream = async () => {
    const local = localRef.current;
    const remote = remoteRef.current;

    if (!local) {
      throw new Error("Local media is unavailable.");
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    await audioContext.resume();

    const destination =
      audioContext.createMediaStreamDestination();

    for (const sourceStream of [local, remote]) {
      if (
        !sourceStream ||
        sourceStream.getAudioTracks().length === 0
      ) {
        continue;
      }

      const audioOnly = new MediaStream(
        sourceStream.getAudioTracks()
      );

      const source =
        audioContext.createMediaStreamSource(
          audioOnly
        );

      source.connect(destination);
    }

    const result = new MediaStream(
      destination.stream.getAudioTracks()
    );

    const hasVideo =
      Boolean(local.getVideoTracks().length) ||
      Boolean(remote?.getVideoTracks().length) ||
      Boolean(screenRef.current);

    if (!hasVideo) {
      return result;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;

    canvasRef.current = canvas;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to initialize video recording."
      );
    }

    const drawVideo = (
      video: HTMLVideoElement | null,
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return false;
      }

      context.drawImage(
        video,
        x,
        y,
        width,
        height
      );

      return true;
    };

    const draw = () => {
      context.fillStyle = "#09090b";
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const mainVideo = remoteVideo.current;
      const smallVideo = localVideo.current;

      const mainDrawn = drawVideo(
        mainVideo,
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (!mainDrawn) {
        drawVideo(
          smallVideo,
          0,
          0,
          canvas.width,
          canvas.height
        );
      } else {
        context.fillStyle = "#18181b";
        context.fillRect(955, 515, 300, 175);

        drawVideo(
          smallVideo,
          960,
          520,
          290,
          165
        );
      }

      animationRef.current =
        requestAnimationFrame(draw);
    };

    draw();

    const canvasStream = canvas.captureStream(25);

    canvasStream
      .getVideoTracks()
      .forEach((track) => result.addTrack(track));

    return result;
  };

  const beginRecording = async () => {
    const current = callRef.current;

    if (
      !current ||
      statusRef.current !== "active" ||
      !recordingApproved ||
      !socket?.connected
    ) {
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError(
        "Recording is not supported in this browser."
      );
      return;
    }

    setError("");

    try {
      // Confirm permission on the server before
      // beginning browser media capture.
      const response = (await socket
        .timeout(12000)
        .emitWithAck("call:recording", {
          callId: current.callId,
          recording: true,
        })) as Ack;

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Recording permission was not granted."
        );
      }

      const stream = await createRecordingStream();
      recordingStreamRef.current = stream;

      if (
        callRef.current?.callId !== current.callId
      ) {
        releaseRecordingResources();
        return;
      }

      const mimeType = chooseMimeType();

      const recorder = new MediaRecorder(
        stream,
        mimeType
          ? { mimeType }
          : undefined
      );

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("An error occurred while recording.");
        setRecording(false);

        socket.emit("call:recording", {
          callId: current.callId,
          recording: false,
        });
      };

      recorder.onstop = () => {
        const blob = new Blob(
          chunksRef.current,
          {
            type:
              recorder.mimeType ||
              "video/webm",
          }
        );

        if (blob.size > 0) {
          if (recordUrlRef.current) {
            URL.revokeObjectURL(
              recordUrlRef.current
            );
          }

          const url = URL.createObjectURL(blob);
          recordUrlRef.current = url;
          setRecordingUrl(url);
        }

        recorderRef.current = null;
        releaseRecordingResources();
      };

      recorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      setRecordingApproved(false);
      setRecordingPending(false);
    } catch (err) {
      releaseRecordingResources();

      socket.emit("call:recording", {
        callId: current.callId,
        recording: false,
      });

      setRecording(false);
      setError(getError(err));
    }
  };

  const finishRecording = () => {
    const current = callRef.current;

    stopRecording();
    setRecordingApproved(false);

    if (current && socket?.connected) {
      socket.emit("call:recording", {
        callId: current.callId,
        recording: false,
      });
    }
  };

  const requestRecording = async () => {
    const current = callRef.current;

    if (
      !current ||
      !socket?.connected ||
      statusRef.current !== "active"
    ) {
      return;
    }

    setError("");
    setRecordingPending(true);

    try {
      const response = (await socket
        .timeout(12000)
        .emitWithAck("call:record-request", {
          callId: current.callId,
        })) as Ack;

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to request recording."
        );
      }
    } catch (err) {
      setRecordingPending(false);
      setError(getError(err));
    }
  };

  const respondToRecording = async (
    approved: boolean
  ) => {
    const current = callRef.current;

    if (!current || !socket?.connected) {
      return;
    }

    try {
      const response = (await socket
        .timeout(12000)
        .emitWithAck("call:record-response", {
          callId: current.callId,
          approved,
        })) as Ack;

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to respond to recording request."
        );
      }

      setRecordingRequested(false);
    } catch (err) {
      setError(getError(err));
    }
  };

  const revokeRecording = () => {
    const current = callRef.current;

    if (!current || !socket?.connected) {
      return;
    }

    socket.emit("call:record-revoke", {
      callId: current.callId,
    });

    stopRecording();
    setRemoteRecording(false);
    setRecordingApproved(false);
    setRecordingRequested(false);
    setRecordingPending(false);
  };

  const sendReaction = (emoji: string) => {
    const current = callRef.current;

    if (
      !current ||
      !socket?.connected ||
      statusRef.current !== "active"
    ) {
      return;
    }

    socket.emit("call:reaction", {
      callId: current.callId,
      emoji,
    });

    setReactions((previous) => [
      ...previous.slice(-5),
      {
        id: crypto.randomUUID(),
        emoji,
        sender: "You",
      },
    ]);
  };

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (incoming: CallInfo) => {
      if (callRef.current) {
        socket.emit("call:reject", {
          callId: incoming.callId,
        });
        return;
      }

      setError("");
      setCurrentCall(incoming);
      setCallStatus("incoming");
    };

    const onAccepted = async (data: {
      callId: string;
    }) => {
      const current = callRef.current;

      if (
        !current ||
        current.callId !== data.callId
      ) {
        return;
      }

      setCallStatus("connecting");

      try {
        const peer = await preparePeer(current);
        const offer = await peer.createOffer();

        await peer.setLocalDescription(offer);

        socket.emit("call:signal", {
          callId: current.callId,
          signal: {
            type: "offer",
            sdp: peer.localDescription,
          },
        });
      } catch (err) {
        setError(getError(err));
        endCall();
      }
    };

    const onSignal = async (data: {
      callId: string;
      signal: Signal;
    }) => {
      const current = callRef.current;

      if (
        !current ||
        current.callId !== data.callId
      ) {
        return;
      }

      try {
        const { signal } = data;

        if (signal.type === "candidate") {
          if (peerRef.current?.remoteDescription) {
            await peerRef.current.addIceCandidate(
              signal.candidate
            );
          } else {
            pendingRef.current.push(
              signal.candidate
            );
          }

          return;
        }

        const peer = await preparePeer(current);

        await peer.setRemoteDescription(
          signal.sdp
        );

        for (const candidate of pendingRef.current) {
          await peer.addIceCandidate(candidate);
        }

        pendingRef.current = [];

        if (signal.type === "offer") {
          const answer = await peer.createAnswer();

          await peer.setLocalDescription(answer);

          socket.emit("call:signal", {
            callId: current.callId,
            signal: {
              type: "answer",
              sdp: peer.localDescription,
            },
          });
        }
      } catch (err) {
        setError(getError(err));
        endCall();
      }
    };

    const onEnded = (data: {
      callId: string;
      reason?: string;
    }) => {
      if (
        callRef.current?.callId !== data.callId
      ) {
        return;
      }

      cleanup();

      if (
        data.reason &&
        data.reason !== "Call ended"
      ) {
        setError(data.reason);
      }
    };

    const onRecording = (data: {
      callId: string;
      recording: boolean;
      reason?: string;
    }) => {
      if (
        callRef.current?.callId !== data.callId
      ) {
        return;
      }

      if (!data.recording) {
        stopRecording();
        setRecordingApproved(false);
        setRecordingPending(false);
        setRemoteRecording(false);

        if (data.reason) {
          setError(data.reason);
        }
      } else {
        setRemoteRecording(true);
      }
    };

    const onRecordRequest = (data: {
      callId: string;
    }) => {
      if (
        callRef.current?.callId === data.callId
      ) {
        setRecordingRequested(true);
      }
    };

    const onRecordResponse = (data: {
      callId: string;
      approved: boolean;
    }) => {
      if (
        callRef.current?.callId !== data.callId
      ) {
        return;
      }

      setRecordingPending(false);
      setRecordingApproved(data.approved);

      if (!data.approved) {
        setError(
          "Recording permission was declined."
        );
      }
    };

    const onReaction = (data: {
      callId: string;
      emoji: string;
      sender: string;
    }) => {
      if (
        callRef.current?.callId !== data.callId
      ) {
        return;
      }

      setReactions((previous) => [
        ...previous.slice(-5),
        {
          id: crypto.randomUUID(),
          emoji: data.emoji,
          sender: data.sender,
        },
      ]);
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:signal", onSignal);
    socket.on("call:ended", onEnded);
    socket.on("call:recording", onRecording);
    socket.on(
      "call:record-request",
      onRecordRequest
    );
    socket.on(
      "call:record-response",
      onRecordResponse
    );
    socket.on("call:reaction", onReaction);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:signal", onSignal);
      socket.off("call:ended", onEnded);
      socket.off("call:recording", onRecording);
      socket.off(
        "call:record-request",
        onRecordRequest
      );
      socket.off(
        "call:record-response",
        onRecordResponse
      );
      socket.off("call:reaction", onReaction);
    };
  }, [
    socket,
    preparePeer,
    endCall,
    cleanup,
    setCurrentCall,
    setCallStatus,
    stopRecording,
  ]);

  useEffect(() => {
    if (localVideo.current) {
      localVideo.current.srcObject =
        localDisplay;
    }
  }, [localDisplay, call, status]);

  useEffect(() => {
    if (remoteVideo.current) {
      remoteVideo.current.srcObject =
        remoteDisplay;
    }

    if (remoteAudio.current) {
      remoteAudio.current.srcObject =
        remoteDisplay;
    }
  }, [remoteDisplay, call, status]);

  useEffect(() => {
    return () => {
      peerRef.current?.close();

      localRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      screenRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      if (recordUrlRef.current) {
        URL.revokeObjectURL(
          recordUrlRef.current
        );
      }
    };
  }, []);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Voice call"
          disabled={
            !socket?.connected ||
            !conversationId ||
            !!call
          }
          onClick={() => void startCall("audio")}
          className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:hover:bg-zinc-800"
        >
          <Phone size={20} />
        </button>

        <button
          type="button"
          title="Video call"
          disabled={
            !socket?.connected ||
            !conversationId ||
            !!call
          }
          onClick={() => void startCall("video")}
          className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 dark:hover:bg-zinc-800"
        >
          <Video size={20} />
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-red-500"
        >
          {error}
        </p>
      )}

      {recordingUrl && !call && (
        <a
          href={recordingUrl}
          download="team-call-recording.webm"
          className="text-sm text-indigo-600 underline"
        >
          <Download
            size={16}
            className="mr-1 inline"
          />
          Download last recording
        </a>
      )}

      {call && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3">
          <div
            ref={callWindow}
            className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-zinc-950 p-5 text-white shadow-2xl"
          >
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold">
                {call.callerName || "Team member"}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {status === "incoming"
                  ? `Incoming ${call.type} call`
                  : status === "calling"
                    ? "Calling..."
                    : status === "connecting"
                      ? "Connecting..."
                      : "Connected"}
              </p>

              {(recording || remoteRecording) && (
                <p className="mt-2 text-sm text-red-400">
                  ● Recording in progress
                </p>
              )}

              {recordingPending && (
                <p className="mt-2 text-xs text-amber-400">
                  Waiting for recording permission...
                </p>
              )}

              {recordingApproved && !recording && (
                <p className="mt-2 text-xs text-green-400">
                  Permission granted. Click Record to start.
                </p>
              )}
            </div>

            <div className="relative mb-5 flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
              <video
                ref={remoteVideo}
                autoPlay
                muted
                playsInline
                className="max-h-[65vh] w-full object-contain"
              />

              <audio
                ref={remoteAudio}
                autoPlay
                playsInline
                className="hidden"
              />

              {call.type === "audio" &&
                !remoteDisplay?.getVideoTracks()
                  .length && (
                  <Phone
                    size={64}
                    className="absolute text-indigo-400"
                  />
                )}

              <video
                ref={localVideo}
                autoPlay
                muted
                playsInline
                className="absolute bottom-3 right-3 h-28 w-40 rounded-lg bg-black object-cover"
              />
            </div>

            {recordingRequested && (
              <div className="mb-4 rounded-xl border border-amber-600 p-4 text-center">
                <p className="mb-3 text-sm">
                  The other participant wants to
                  record this call. Do you consent?
                </p>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      void respondToRecording(true)
                    }
                    className="rounded-lg bg-green-600 px-4 py-2"
                  >
                    Allow
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void respondToRecording(false)
                    }
                    className="rounded-lg bg-red-600 px-4 py-2"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {status === "active" && (
              <div className="mb-5">
                <p className="mb-2 text-center text-xs text-zinc-400">
                  Send a reaction
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      title={`Send ${emoji}`}
                      onClick={() =>
                        sendReaction(emoji)
                      }
                      className="rounded-full bg-zinc-800 p-2 text-xl hover:bg-zinc-700"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {reactions.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {reactions.map((reaction) => (
                      <span
                        key={reaction.id}
                        className="rounded-full bg-indigo-950 px-3 py-1 text-sm"
                      >
                        {reaction.emoji}{" "}
                        {reaction.sender}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              {status === "incoming" ? (
                <>
                  <button
                    type="button"
                    title="Accept call"
                    onClick={() =>
                      void acceptCall()
                    }
                    className="rounded-full bg-green-600 p-4"
                  >
                    <Phone />
                  </button>

                  <button
                    type="button"
                    title="Reject call"
                    onClick={rejectCall}
                    className="rounded-full bg-red-600 p-4"
                  >
                    <PhoneOff />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    title={
                      muted ? "Unmute" : "Mute"
                    }
                    onClick={toggleMute}
                    className="rounded-full bg-zinc-700 p-3"
                  >
                    {muted ? <MicOff /> : <Mic />}
                  </button>

                  {call.type === "video" && (
                    <button
                      type="button"
                      title="Toggle camera"
                      onClick={toggleCamera}
                      className="rounded-full bg-zinc-700 p-3"
                    >
                      {cameraOff ? (
                        <VideoOff />
                      ) : (
                        <Video />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    title={
                      sharing
                        ? "Stop sharing"
                        : "Share screen"
                    }
                    disabled={status !== "active"}
                    onClick={() =>
                      void (sharing
                        ? stopSharing()
                        : startSharing())
                    }
                    className="rounded-full bg-zinc-700 p-3 disabled:opacity-40"
                  >
                    <MonitorUp />
                  </button>

                  <button
                    type="button"
                    title="Full screen"
                    onClick={() => {
                      void callWindow.current?.requestFullscreen();
                    }}
                    className="rounded-full bg-zinc-700 p-3"
                  >
                    <Maximize />
                  </button>

                  <button
                    type="button"
                    title={
                      recording
                        ? "Stop recording"
                        : "Record call"
                    }
                    disabled={
                      status !== "active" ||
                      recordingPending
                    }
                    onClick={() => {
                      if (recording) {
                        finishRecording();
                      } else if (recordingApproved) {
                        void beginRecording();
                      } else {
                        void requestRecording();
                      }
                    }}
                    className="rounded-full bg-zinc-700 p-3 disabled:opacity-40"
                  >
                    {recording ? (
                      <Square />
                    ) : (
                      <Circle />
                    )}
                  </button>

                  <button
                    type="button"
                    title="End call"
                    onClick={endCall}
                    className="rounded-full bg-red-600 p-3"
                  >
                    <PhoneOff />
                  </button>
                </>
              )}
            </div>

            {(recording ||
              remoteRecording ||
              recordingRequested) && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={revokeRecording}
                  className="rounded-lg border border-red-600 px-4 py-2 text-xs text-red-300 hover:bg-red-950"
                >
                  Withdraw recording consent / Stop recording
                </button>
              </div>
            )}

            {recordingUrl && (
              <a
                href={recordingUrl}
                download="team-call-recording.webm"
                className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-300 underline"
              >
                <Download size={17} />
                Download recording
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
