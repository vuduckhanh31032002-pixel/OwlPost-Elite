package edu.khanh2002.chatapp.websocket;

import edu.khanh2002.chatapp.config.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/ws/user/{userId}")
@Component
public class UserSocket {

    private static final Map<Long, Set<Session>> userSessions = new ConcurrentHashMap<>();
    private static JwtUtil jwtUtil;
    private static final ObjectMapper mapper = new ObjectMapper();

    public static void setJwtUtil(JwtUtil jwtUtil) {
        UserSocket.jwtUtil = jwtUtil;
    }

    @OnOpen
    public void onOpen(Session session, @PathParam("userId") Long userId) {
        List<String> tokens = session.getRequestParameterMap().get("token");
        String token = tokens != null && !tokens.isEmpty() ? tokens.get(0) : null;

        if (token == null || !jwtUtil.validateToken(token)) {
            try {
                session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Unauthorized"));
            } catch (Exception ignored) {
            }
            return;
        }

        userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @OnClose
    public void onClose(Session session, @PathParam("userId") Long userId) {
        userSessions.getOrDefault(userId, Set.of()).remove(session);
    }

    public static void sendToUser(Long userId, Object event) {
        Set<Session> sessions = userSessions.getOrDefault(userId, Set.of());
        String json;
        try {
            json = mapper.writeValueAsString(event);
        } catch (Exception e) {
            return;
        }
        for (Session s : sessions) {
            if (s.isOpen()) {
                try {
                    s.getBasicRemote().sendText(json);
                } catch (Exception ignored) {
                }
            }
        }
    }

    public static void broadcastToUsers(List<Long> userIds, Object event) {
        for (Long userId : userIds) {
            sendToUser(userId, event);
        }
    }
}
