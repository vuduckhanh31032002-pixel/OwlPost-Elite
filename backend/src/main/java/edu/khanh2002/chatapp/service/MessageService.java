package edu.khanh2002.chatapp.service;

import edu.khanh2002.chatapp.dto.MessageResponse;
import edu.khanh2002.chatapp.entity.BlockedUser;
import edu.khanh2002.chatapp.entity.ChatRoom;
import edu.khanh2002.chatapp.entity.Message;
import edu.khanh2002.chatapp.entity.RoomMember;
import edu.khanh2002.chatapp.entity.User;
import edu.khanh2002.chatapp.repository.BlockedUserRepository;
import edu.khanh2002.chatapp.repository.ChatRoomRepository;
import edu.khanh2002.chatapp.repository.MessageRepository;
import edu.khanh2002.chatapp.repository.RoomMemberRepository;
import edu.khanh2002.chatapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final BlockedUserRepository blockedUserRepository;

    public MessageResponse sendMessage(Long roomId, Long senderId, String content) {
        return sendMessage(roomId, senderId, content, null);
    }

    public MessageResponse sendMessage(Long roomId, Long senderId, String content, String imageUrl) {

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        // Check block relationships
        List<RoomMember> members = roomMemberRepository.findByIdRoomId(roomId);
        for (RoomMember member : members) {
            Long memberId = member.getId().getUserId();
            if (memberId.equals(senderId)) continue;

            // Check if sender blocked this member OR member blocked sender
            if (blockedUserRepository.existsByBlockerIdAndBlockedId(senderId, memberId)
                    || blockedUserRepository.existsByBlockerIdAndBlockedId(memberId, senderId)) {
                throw new RuntimeException("Cannot send message: user blocked");
            }
        }

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .content(content)
                .imageUrl(imageUrl)
                .build();

        Message saved = messageRepository.save(message);
        return toResponse(saved);
    }

    public List<MessageResponse> getMessages(Long roomId) {
        return messageRepository.findByRoom_IdOrderBySentTimeAsc(roomId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<MessageResponse> getMessages(Long roomId, int size, Long lastId) {
        int limit = Math.max(1, Math.min(size, 200));
        Pageable pageable = PageRequest.of(0, limit);
        return messageRepository.findRecentByRoomId(roomId, lastId, pageable)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private MessageResponse toResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .roomId(message.getRoom() != null ? message.getRoom().getId() : null)
                .sender(MessageResponse.SenderInfo.builder()
                        .id(message.getSender() != null ? message.getSender().getId() : null)
                        .fullName(message.getSender() != null ? message.getSender().getFullName() : null)
                        .avatar(message.getSender() != null ? message.getSender().getAvatar() : null)
                        .build())
                .content(message.getContent())
                .imageUrl(message.getImageUrl())
                .sentTime(message.getSentTime() != null ? message.getSentTime().toString() : null)
                .build();
    }
}
