let socket = null;
let socketOnMessage = null;
let socketCurrentRoomId = null;
let socketReconnectAttempt = 0;
let socketReconnectTimeout = null;
let socketIntentionalClose = false;

const BACKEND_ORIGIN =
  import.meta.env.VITE_BACKEND_ORIGIN || "http://localhost:8081";

const getToken = () => localStorage.getItem("token");

const toWsUrl = (baseUrl, roomId) => {
  const normalized = baseUrl.replace(/\/$/, "");
  const token = getToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : "";

  if (normalized.startsWith("https://")) {
    return normalized.replace("https://", "wss://") + `/ws/${roomId}${query}`;
  }

  if (normalized.startsWith("http://")) {
    return normalized.replace("http://", "ws://") + `/ws/${roomId}${query}`;
  }

  return `${normalized}/ws/${roomId}${query}`;
};

const scheduleSocketReconnect = (roomId, onMessage) => {
  if (socketIntentionalClose || !roomId) return;

  const delay = Math.min(1000 * Math.pow(2, socketReconnectAttempt), 15000);
  socketReconnectAttempt++;

  socketReconnectTimeout = setTimeout(() => {
    connectSocket(roomId, onMessage);
  }, delay);
};

const clearSocketReconnect = () => {
  if (socketReconnectTimeout) {
    clearTimeout(socketReconnectTimeout);
    socketReconnectTimeout = null;
  }
  socketReconnectAttempt = 0;
};

export const connectSocket = (roomId, onMessage) => {
  if (!roomId) return;

  socketOnMessage = onMessage;
  socketCurrentRoomId = roomId;
  socketIntentionalClose = false;

  if (socket && socket.readyState === WebSocket.OPEN) {
    clearSocketReconnect();
    return;
  }

  if (socket) {
    socket.close();
    socket = null;
  }

  socket = new WebSocket(toWsUrl(BACKEND_ORIGIN, roomId));

  socket.onopen = () => {
    console.log("WebSocket connected");
    clearSocketReconnect();
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (socketOnMessage) {
      socketOnMessage(data);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected");
    scheduleSocketReconnect(socketCurrentRoomId, socketOnMessage);
  };
};

export const sendMessage = (roomId, senderId, content, imageUrl = null) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.log("Socket chưa kết nối");
    return;
  }

  socket.send(
    JSON.stringify({
      senderId,
      content,
      imageUrl,
    }),
  );
};

export const disconnectSocket = () => {
  socketIntentionalClose = true;
  clearSocketReconnect();

  if (socket) {
    socket.close();
    socket = null;
  }
  socketOnMessage = null;
  socketCurrentRoomId = null;
};