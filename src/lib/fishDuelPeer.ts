import { Peer, DataConnection, MediaConnection } from "peerjs";

export interface FishTelemetry {
  dist: number; // 0 - 100
  speed: number;
  motionIntensity: number; // 0 - 100
  fishName: string;
}

export type DuelMessageType =
  | { type: "JOIN_REQUEST"; fishName: string }
  | { type: "JOIN_ACCEPTED"; fishName: string }
  | { type: "TELEMETRY"; telemetry: FishTelemetry }
  | { type: "READY"; ready: boolean }
  | { type: "START_COUNTDOWN"; startTime: number }
  | { type: "RESET" };

const PEER_PREFIX = "meemee-olympics-duel-";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

export class FishDuelSession {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private mediaCall: MediaConnection | null = null;
  private localStream: MediaStream | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  public roomId: string = "";
  public isHost: boolean = false;
  public myFishName: string = "Meemee";
  public opponentFishName: string = "Challenger Fish";

  // Callbacks
  public onConnected: (() => void) | null = null;
  public onDisconnected: (() => void) | null = null;
  public onMessage: ((msg: DuelMessageType) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onError: ((err: string) => void) | null = null;

  constructor(myFishName: string = "Meemee") {
    this.myFishName = myFishName;
  }

  // Create room as Host (Laptop 1)
  public hostRoom(localStream?: MediaStream | null): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.localStream = localStream || null;

      // Generate 4-digit room code
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      this.roomId = randomCode;
      const peerId = `${PEER_PREFIX}${randomCode}`;

      this.setupBroadcastChannel(randomCode);

      try {
        this.peer = new Peer(peerId, {
          debug: 1,
          config: {
            iceServers: ICE_SERVERS,
          },
        });

        this.peer.on("open", () => {
          resolve(this.roomId);
        });

        this.peer.on("connection", (conn) => {
          this.connection = conn;
          this.setupDataConnection(conn);
        });

        this.peer.on("call", (call) => {
          this.mediaCall = call;
          if (this.localStream) {
            call.answer(this.localStream);
          } else {
            call.answer();
          }
          call.on("stream", (remoteStream) => {
            if (this.onRemoteStream) this.onRemoteStream(remoteStream);
          });
        });

        this.peer.on("error", (err) => {
          console.warn("PeerJS error:", err);
          if (this.onError) this.onError(err.message || "P2P connection error");
          // BroadcastChannel remains active as local fallback
          resolve(this.roomId);
        });
      } catch (err) {
        console.warn("Failed to initialize PeerJS:", err);
        resolve(this.roomId);
      }
    });
  }

  // Join room as Challenger (Laptop 2)
  public joinRoom(roomCode: string, localStream?: MediaStream | null): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.roomId = roomCode.trim().toUpperCase().replace(/[^0-9]/g, "");
      this.localStream = localStream || null;

      this.setupBroadcastChannel(this.roomId);

      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: ICE_SERVERS,
          },
        });

        this.peer.on("open", () => {
          const hostPeerId = `${PEER_PREFIX}${this.roomId}`;
          const conn = this.peer!.connect(hostPeerId, { reliable: true });
          this.connection = conn;
          this.setupDataConnection(conn);

          // Initiate media call if local stream available
          if (this.localStream) {
            const call = this.peer!.call(hostPeerId, this.localStream);
            this.mediaCall = call;
            call.on("stream", (remoteStream) => {
              if (this.onRemoteStream) this.onRemoteStream(remoteStream);
            });
          }

          resolve();
        });

        this.peer.on("error", (err) => {
          console.warn("PeerJS join error:", err);
          if (this.onError) this.onError(err.message || "Failed to reach host laptop");
          resolve();
        });
      } catch (err) {
        console.warn("PeerJS initialize error:", err);
        resolve();
      }
    });
  }

  // BroadcastChannel for instant testing across 2 tabs on same device
  private setupBroadcastChannel(roomCode: string) {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`meemee-duel-${roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data as DuelMessageType & { senderIsHost?: boolean };
          // Ignore own messages
          if (msg.senderIsHost !== this.isHost) {
            if (msg.type === "JOIN_REQUEST" && this.isHost) {
              this.opponentFishName = msg.fishName;
              if (this.onConnected) this.onConnected();
              this.sendMessage({ type: "JOIN_ACCEPTED", fishName: this.myFishName });
            } else if (msg.type === "JOIN_ACCEPTED" && !this.isHost) {
              this.opponentFishName = msg.fishName;
              if (this.onConnected) this.onConnected();
            }
            if (this.onMessage) this.onMessage(msg);
          }
        };

        // If joining, send join request immediately
        if (!this.isHost) {
          setTimeout(() => {
            this.sendMessage({ type: "JOIN_REQUEST", fishName: this.myFishName });
          }, 300);
        }
      } catch (e) {
        console.warn("BroadcastChannel not supported:", e);
      }
    }
  }

  private setupDataConnection(conn: DataConnection) {
    conn.on("open", () => {
      if (this.onConnected) this.onConnected();
      if (!this.isHost) {
        this.sendMessage({ type: "JOIN_REQUEST", fishName: this.myFishName });
      }
    });

    conn.on("data", (data) => {
      const msg = data as DuelMessageType;
      if (msg.type === "JOIN_REQUEST") {
        this.opponentFishName = msg.fishName;
        this.sendMessage({ type: "JOIN_ACCEPTED", fishName: this.myFishName });
      } else if (msg.type === "JOIN_ACCEPTED") {
        this.opponentFishName = msg.fishName;
      }
      if (this.onMessage) this.onMessage(msg);
    });

    conn.on("close", () => {
      if (this.onDisconnected) this.onDisconnected();
    });
  }

  // Send message to opponent laptop
  public sendMessage(msg: DuelMessageType) {
    // Send via WebRTC DataChannel if open
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(msg);
      } catch (e) {
        console.warn("Error sending via P2P connection:", e);
      }
    }

    // Also send via BroadcastChannel for local tab fallback
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ ...msg, senderIsHost: this.isHost });
      } catch (e) {
        console.warn("Error sending via BroadcastChannel:", e);
      }
    }
  }

  public updateLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  // Disconnect & Cleanup
  public close() {
    if (this.mediaCall) {
      this.mediaCall.close();
      this.mediaCall = null;
    }
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}
