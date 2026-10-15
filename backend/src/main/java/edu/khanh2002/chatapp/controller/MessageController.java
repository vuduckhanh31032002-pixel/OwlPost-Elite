package edu.khanh2002.chatapp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.khanh2002.chatapp.config.AuthUtil;
import edu.khanh2002.chatapp.dto.MessageResponse;
import edu.khanh2002.chatapp.entity.RoomMember;
import edu.khanh2002.chatapp.repository.RoomMemberRepository;
import edu.khanh2002.chatapp.service.MessageService;
import edu.khanh2002.chatapp.dto.SendMessageRequest;
import edu.khanh2002.chatapp.websocket.ChatSocket;
import edu.khanh2002.chatapp.websocket.UserSocket;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final ObjectMapper objectMapper;
    private final RoomMemberRepository roomMemberRepository;

    @PostMapping("/send")
    public MessageResponse sendMessage(@Valid @RequestBody SendMessageRequest request) {

        Long authenticatedUserId = AuthUtil.getCurrentUserId();

        MessageResponse response = messageService.sendMessage(
                request.getRoomId(),
                authenticatedUserId,
                request.getContent(),
                request.getImageUrl()
        );

        try {
            String json = objectMapper.writeValueAsString(response);
            ChatSocket.broadcast(String.valueOf(request.getRoomId()), json);

            Map<String, Object> userEvent = new HashMap<>();
            userEvent.put("type", "NEW_MESSAGE");
            userEvent.put("roomId", request.getRoomId());
            userEvent.put("message", response);

            List<RoomMember> members = roomMemberRepository.findByIdRoomId(request.getRoomId());
            for (RoomMember member : members) {
                Long memberId = member.getId().getUserId();
                if (memberId.equals(authenticatedUserId)) continue;
                UserSocket.sendToUser(memberId, userEvent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return response;
    }

    @GetMapping("/{roomId}")
    public List<MessageResponse> getMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "50") Integer size,
            @RequestParam(required = false) Long lastId
    ) {
        return messageService.getMessages(roomId, size, lastId);
    }
}
