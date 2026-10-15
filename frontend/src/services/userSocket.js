let userSocket = null;
let userSocketOnMessage = null;
let userSocketReconnectAttempt = 0;
let userSocketReconnectTimeout = null;
let userSocketIntentionalClose = false;
let userSocketCurrentUserId = null;

const BACKEND_ORIGIN =
  import.meta.env.VITE_BACKEND_ORIGIN || "http://localhost:8081";

const getToken = () => localStorage.getItem("token");

const toUserWsUrl = (baseUrl, userId) => {
  const normalized = baseUrl.replace(/\/$/, "");
  const token = getToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : "";

  if (normalized.startsWith("https://")) {
    return normalized.replace("https://", "wss://") + `/ws/user/${userId}${query}`;
  }

  if (normalized.startsWith("http://")) {
    return normalized.replace("http://", "ws://") + `/ws/user/${userId}${query}`;
  }

  return `${normalized}/ws/user/${userId}${query}`;
};

const scheduleUserSocketReconnect = (userId, onMessage) => {
  if (userSocketIntentionalClose || !userId) return;

  const delay = Math.min(1000 * Math.pow(2, userSocketReconnectAttempt), 15000);
  userSocketReconnectAttempt++;

  userSocketReconnectTimeout = setTimeout(() => {
    connectUserSocket(userId, onMessage);
  }, delay);
};

const clearUserSocketReconnect = () => {
  if (userSocketReconnectTimeout) {
    clearTimeout(userSocketReconnectTimeout);
    userSocketReconnectTimeout = null;
  }
  userSocketReconnectAttempt = 0;
};

export const connectUserSocket = (userId, onMessage) => {
  if (!userId) return;

  userSocketOnMessage = onMessage;
  userSocketCurrentUserId = userId;
  userSocketIntentionalClose = false;

  if (userSocket && userSocket.readyState === WebSocket.OPEN) {
    clearUserSocketReconnect();
    return;
  }

  if (userSocket) {
    userSocket.close();
    userSocket = null;
  }

  userSocket = new WebSocket(toUserWsUrl(BACKEND_ORIGIN, userId));

  userSocket.onopen = () => {
    console.log("User socket connected");
    clearUserSocketReconnect();
  };

  userSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (userSocketOnMessage) {
        userSocketOnMessage(data);
      }
    } catch (e) {
      console.error("Parse user socket message failed:", e);
    }
  };

  userSocket.onerror = (error) => {
    console.error("User socket error:", error);
  };

  userSocket.onclose = () => {
    console.log("User socket disconnected");
    scheduleUserSocketReconnect(userSocketCurrentUserId, userSocketOnMessage);
  };
};

export const disconnectUserSocket = () => {
  userSocketIntentionalClose = true;
  clearUserSocketReconnect();

  if (userSocket) {
    userSocket.close();
    userSocket = null;
  }
  userSocketOnMessage = null;
  userSocketCurrentUserId = null;
};