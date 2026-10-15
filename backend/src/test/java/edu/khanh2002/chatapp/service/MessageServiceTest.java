package edu.khanh2002.chatapp.service;

import edu.khanh2002.chatapp.dto.MessageResponse;
import edu.khanh2002.chatapp.entity.ChatRoom;
import edu.khanh2002.chatapp.entity.Message;
import edu.khanh2002.chatapp.entity.RoomMember;
import edu.khanh2002.chatapp.entity.User;
import edu.khanh2002.chatapp.repository.BlockedUserRepository;
import edu.khanh2002.chatapp.repository.ChatRoomRepository;
import edu.khanh2002.chatapp.repository.MessageRepository;
import edu.khanh2002.chatapp.repository.RoomMemberRepository;
import edu.khanh2002.chatapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ChatRoomRepository chatRoomRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private BlockedUserRepository blockedUserRepository;

    @InjectMocks
    private MessageService messageService;

    @Test
    void sendMessage_ShouldSaveAndReturnResponse() {
        ChatRoom room = ChatRoom.builder().id(1L).build();
        User sender = User.builder().id(2L).fullName("Sender").avatar("avatar.png").build();

        when(chatRoomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(userRepository.findById(2L)).thenReturn(Optional.of(sender));
        when(roomMemberRepository.findByIdRoomId(1L)).thenReturn(List.of());
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message m = invocation.getArgument(0);
            m.setId(10L);
            m.setSentTime(LocalDateTime.now());
            return m;
        });

        MessageResponse result = messageService.sendMessage(1L, 2L, "Hello", null);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals("Hello", result.getContent());
        assertEquals(1L, result.getRoomId());
        assertEquals(2L, result.getSender().getId());
        assertEquals("Sender", result.getSender().getFullName());
    }

    @Test
    void getMessages_ShouldReturnMappedResponses() {
        ChatRoom room = ChatRoom.builder().id(1L).build();
        User sender = User.builder().id(2L).fullName("Sender").build();

        Message m1 = Message.builder()
                .id(1L).room(room).sender(sender).content("Hi").sentTime(LocalDateTime.now())
                .build();
        Message m2 = Message.builder()
                .id(2L).room(room).sender(sender).content("Hello").sentTime(LocalDateTime.now())
                .build();

        when(messageRepository.findByRoom_IdOrderBySentTimeAsc(1L)).thenReturn(List.of(m1, m2));

        List<MessageResponse> results = messageService.getMessages(1L);

        assertEquals(2, results.size());
        assertEquals("Hi", results.get(0).getContent());
        assertEquals("Hello", results.get(1).getContent());
    }

    @Test
    void getMessagesPaginated_ShouldReturnMappedResponses() {
        ChatRoom room = ChatRoom.builder().id(1L).build();
        User sender = User.builder().id(2L).fullName("Sender").build();

        Message m1 = Message.builder()
                .id(1L).room(room).sender(sender).content("old").sentTime(LocalDateTime.now())
                .build();
        Message m2 = Message.builder()
                .id(2L).room(room).sender(sender).content("new").sentTime(LocalDateTime.now())
                .build();

        when(messageRepository.findRecentByRoomId(eq(1L), eq(10L), any(Pageable.class)))
                .thenReturn(List.of(m2, m1));

        List<MessageResponse> results = messageService.getMessages(1L, 50, 10L);

        assertEquals(2, results.size());
        assertEquals("new", results.get(0).getContent());
        assertEquals("old", results.get(1).getContent());
    }

    @Test
    void getMessagesPaginated_ShouldClampSize() {
        ChatRoom room = ChatRoom.builder().id(1L).build();
        User sender = User.builder().id(2L).fullName("Sender").build();

        when(messageRepository.findRecentByRoomId(eq(1L), isNull(), any(Pageable.class)))
                .thenReturn(List.of());

        List<MessageResponse> results = messageService.getMessages(1L, 9999, null);

        assertEquals(0, results.size());
    }

    @Test
    void sendMessage_ShouldThrowWhenRoomNotFound() {
        when(chatRoomRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> messageService.sendMessage(99L, 1L, "test", null));
    }

    @Test
    void sendMessage_ShouldThrowWhenSenderNotFound() {
        ChatRoom room = ChatRoom.builder().id(1L).build();
        when(chatRoomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> messageService.sendMessage(1L, 99L, "test", null));
    }

    @Test
    void sendMessage_ShouldThrowWhenBlocked() {
        ChatRoom room = ChatRoom.builder().id(1L).build();
        User sender = User.builder().id(2L).fullName("Sender").build();
        RoomMember member = mock(RoomMember.class);
        when(member.getId()).thenReturn(new edu.khanh2002.chatapp.entity.RoomMemberId(1L, 3L));

        when(chatRoomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(userRepository.findById(2L)).thenReturn(Optional.of(sender));
        when(roomMemberRepository.findByIdRoomId(1L)).thenReturn(List.of(member));
        when(blockedUserRepository.existsByBlockerIdAndBlockedId(2L, 3L)).thenReturn(true);

        assertThrows(RuntimeException.class, () -> messageService.sendMessage(1L, 2L, "test", null));
    }
}
