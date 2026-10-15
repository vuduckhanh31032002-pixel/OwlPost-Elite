package edu.khanh2002.chatapp.service;

import edu.khanh2002.chatapp.entity.ChatRoom;
import edu.khanh2002.chatapp.entity.Message;
import edu.khanh2002.chatapp.entity.RoomMember;
import edu.khanh2002.chatapp.entity.RoomMemberId;
import edu.khanh2002.chatapp.entity.User;
import edu.khanh2002.chatapp.repository.ChatRoomRepository;
import edu.khanh2002.chatapp.repository.GroupInviteRepository;
import edu.khanh2002.chatapp.repository.MessageRepository;
import edu.khanh2002.chatapp.repository.RoomMemberRepository;
import edu.khanh2002.chatapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatRoomServiceMergeTest {

    @Mock private RoomMemberRepository roomMemberRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private ChatRoomRepository chatRoomRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupInviteRepository groupInviteRepository;

    @InjectMocks private ChatRoomService chatRoomService;

    @Test
    void restoreConversation_privateWithSiblingNewRoom_mergesAndDeletesNewRoom() {
        Long khanhId = 1L;
        Long emiId = 2L;
        Long oldRoomId = 100L;
        Long newRoomId = 200L;

        ChatRoom oldRoom = ChatRoom.builder().id(oldRoomId).isPrivate(true).build();
        ChatRoom newRoom = ChatRoom.builder().id(newRoomId).isPrivate(true).build();

        RoomMember khanhInOld = RoomMember.builder()
                .id(new RoomMemberId(oldRoomId, khanhId))
                .deleted(true)
                .build();
        RoomMember emiInOld = RoomMember.builder()
                .id(new RoomMemberId(oldRoomId, emiId))
                .deleted(false)
                .build();
        RoomMember khanhInNew = RoomMember.builder()
                .id(new RoomMemberId(newRoomId, khanhId))
                .deleted(false)
                .build();
        RoomMember emiInNew = RoomMember.builder()
                .id(new RoomMemberId(newRoomId, emiId))
                .deleted(true)
                .build();

        User khanh = User.builder().id(khanhId).fullName("Khanh").build();
        User emi = User.builder().id(emiId).fullName("Emi").build();

        Message oldMsg1 = Message.builder().id(1L).room(oldRoom).sender(khanh).content("A1").sentTime(LocalDateTime.of(2026, 9, 3, 10, 0)).build();
        Message oldMsg2 = Message.builder().id(2L).room(oldRoom).sender(emi).content("A2").sentTime(LocalDateTime.of(2026, 9, 3, 10, 5)).build();
        Message newMsg1 = Message.builder().id(3L).room(newRoom).sender(khanh).content("B1").sentTime(LocalDateTime.of(2026, 9, 3, 10, 10)).build();
        Message newMsg2 = Message.builder().id(4L).room(newRoom).sender(emi).content("B2").sentTime(LocalDateTime.of(2026, 9, 3, 10, 15)).build();

        when(roomMemberRepository.existsById(new RoomMemberId(oldRoomId, khanhId))).thenReturn(true);
        when(chatRoomRepository.findById(oldRoomId)).thenReturn(Optional.of(oldRoom));
        when(roomMemberRepository.findByIdRoomId(oldRoomId)).thenReturn(List.of(khanhInOld, emiInOld));
        when(chatRoomRepository.findOtherPrivateRoomsBetween(khanhId, emiId, oldRoomId))
                .thenReturn(List.of(newRoom));

        when(messageRepository.findAllByRoomId(newRoomId)).thenReturn(List.of(newMsg1, newMsg2));

        when(roomMemberRepository.findByIdRoomId(oldRoomId))
                .thenReturn(List.of(khanhInOld, emiInOld));

        chatRoomService.restoreConversation(oldRoomId, khanhId);

        ArgumentCaptor<ChatRoom> oldCaptor = ArgumentCaptor.forClass(ChatRoom.class);
        ArgumentCaptor<ChatRoom> newCaptor = ArgumentCaptor.forClass(ChatRoom.class);
        verify(messageRepository).updateRoomForMessages(newCaptor.capture(), oldCaptor.capture());
        assertEquals(newRoom.getId(), newCaptor.getValue().getId());
        assertEquals(oldRoom.getId(), oldCaptor.getValue().getId());

        verify(roomMemberRepository).deleteAllByRoomId(newRoomId);
        verify(chatRoomRepository).delete(newRoom);
        verify(roomMemberRepository).restore(oldRoomId, khanhId);
    }

    @Test
    void restoreConversation_privateNoSiblingRoom_doesNotTouchMessages() {
        Long khanhId = 1L;
        Long emiId = 2L;
        Long oldRoomId = 100L;

        ChatRoom oldRoom = ChatRoom.builder().id(oldRoomId).isPrivate(true).build();

        RoomMember khanhInOld = RoomMember.builder()
                .id(new RoomMemberId(oldRoomId, khanhId))
                .deleted(true)
                .build();
        RoomMember emiInOld = RoomMember.builder()
                .id(new RoomMemberId(oldRoomId, emiId))
                .deleted(false)
                .build();

        when(roomMemberRepository.existsById(new RoomMemberId(oldRoomId, khanhId))).thenReturn(true);
        when(chatRoomRepository.findById(oldRoomId)).thenReturn(Optional.of(oldRoom));
        when(roomMemberRepository.findByIdRoomId(oldRoomId)).thenReturn(List.of(khanhInOld, emiInOld));
        when(chatRoomRepository.findOtherPrivateRoomsBetween(khanhId, emiId, oldRoomId))
                .thenReturn(List.of());

        chatRoomService.restoreConversation(oldRoomId, khanhId);

        verify(messageRepository, never()).updateRoomForMessages(any(), any());
        verify(chatRoomRepository, never()).delete(any());
        verify(roomMemberRepository).restore(oldRoomId, khanhId);
    }
}