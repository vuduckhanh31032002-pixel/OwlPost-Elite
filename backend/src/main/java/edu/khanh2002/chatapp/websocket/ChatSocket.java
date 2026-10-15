package edu.khanh2002.chatapp.websocket;

import edu.khanh2002.chatapp.config.JwtUtil;
import edu.khanh2002.chatapp.config.SpringEndpointConfigurator;
import edu.khanh2002.chatapp.dto.MessageResponse;
import edu.khanh2002.chatapp.entity.RoomMember;
import edu.khanh2002.chatapp.entity.RoomMemberId;
import edu.khanh2002.chatapp.repository.RoomMemberRepository;
import edu.khanh2002.chatapp.service.MessageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint(value = "/ws/{roomId}", configurator = SpringEndpointConfigurator.class)
@Component
public class ChatSocket {

    private static final Map<String, Set<Session>> rooms = new ConcurrentHashMap<>();
    private static final ObjectMapper mapper = new ObjectMapper();

    private MessageService messageService;
    private JwtUtil jwtUtil;
    private RoomMemberRepository roomMemberRepository;

    @Autowired
    public void setMessageService(MessageService service) {
        this.messageService = service;
    }

    @Autowired
    public void setJwtUtil(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Autowired
    public void setRoomMemberRepository(RoomMemberRepository repository) {
        this.roomMemberRepository = repository;
    }

    @OnOpen
    public void onOpen(Session session, @PathParam("roomId") String roomId) {
        List<String> tokens = session.getRequestParameterMap().get("token");
        String token = tokens != null && !tokens.isEmpty() ? tokens.get(0) : null;

        if (token == null || !jwtUtil.validateToken(token)) {
            try {
                session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Unauthorized"));
            } catch (Exception ignored) {
            }
            return;
        }

        Long userId = jwtUtil.getUserId(token);
        Long roomIdLong = Long.parseLong(roomId);

        // Check room membership (active, not deleted) - REQUIRED, no null bypass
        RoomMemberId memberId = new RoomMemberId(roomIdLong, userId);
        RoomMember member = roomMemberRepository.findById(memberId).orElse(null);
        if (member == null || Boolean.TRUE.equals(member.isDeleted())) {
            try {
                session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Not a member of this room"));
            } catch (Exception ignored) {
            }
            return;
        }

        session.getUserProperties().put("userId", userId);

        rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @OnMessage
    public void onMessage(String message,
                          Session session,
                          @PathParam("roomId") String roomId) throws Exception {

        Map<String, Object> data = mapper.readValue(message, Map.class);

        Object userIdObj = session.getUserProperties().get("userId");
        if (userIdObj == null) {
            return;
        }
        Long senderId = Long.valueOf(userIdObj.toString());
        Long roomIdLong = Long.parseLong(roomId);
        String content = data.getOrDefault("content", "").toString();
        String imageUrl = data.get("imageUrl") != null ? data.get("imageUrl").toString() : null;

        MessageResponse saved = messageService.sendMessage(
                roomIdLong,
                senderId,
                content,
                imageUrl
        );

        String json = mapper.writeValueAsString(saved);

        for (Session s : rooms.getOrDefault(roomId, Set.of())) {
            if (s.isOpen()) {
                s.getBasicRemote().sendText(json);
            }
        }
    }

    @OnClose
    public void onClose(Session session,
                        @PathParam("roomId") String roomId) {
        rooms.getOrDefault(roomId, Set.of()).remove(session);
    }

    public static void broadcast(String roomId, String json) {
        for (Session s : rooms.getOrDefault(roomId, Set.of())) {
            if (s.isOpen()) {
                try {
                    s.getBasicRemote().sendText(json);
                } catch (Exception ignored) {
                }
            }
        }
    }
}
