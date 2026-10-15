package edu.khanh2002.chatapp.service;

import edu.khanh2002.chatapp.dto.FriendResponse;
import edu.khanh2002.chatapp.entity.*;
import edu.khanh2002.chatapp.repository.*;
import edu.khanh2002.chatapp.websocket.UserSocket;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendService {

    private static final String PENDING = "PENDING";
    private static final String ACCEPTED = "ACCEPTED";
    private static final String REJECTED = "REJECTED";

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final FriendsRepository friendsRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final RoomMemberRepository roomMemberRepository;

    @Transactional
    public FriendRequest sendRequest(Long senderId, Long receiverId) {
        if (senderId.equals(receiverId)) {
            throw new RuntimeException("Cannot add yourself");
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        if (friendsRepository.existsByIdUserIdAndIdFriendId(senderId, receiverId)) {
            throw new RuntimeException("Already friends");
        }

        // Dọn toàn bộ request cũ giữa 2 người để tránh kẹt trạng thái
        List<FriendRequest> oldRequests = friendRequestRepository
                .findBySender_IdAndReceiver_IdOrSender_IdAndReceiver_Id(senderId, receiverId, receiverId, senderId);
        if (!oldRequests.isEmpty()) {
            friendRequestRepository.deleteAll(oldRequests);
        }

        FriendRequest request = FriendRequest.builder()
                .sender(sender)
                .receiver(receiver)
                .status(PENDING)
                .build();

        FriendRequest saved = friendRequestRepository.save(request);

        // Send real-time event to receiver
        Map<String, Object> event = new HashMap<>();
        event.put("type", "FRIEND_REQUEST_RECEIVED");
        event.put("requestId", saved.getId());
        event.put("senderId", senderId);
        event.put("senderName", sender.getFullName());
        event.put("senderEmail", sender.getEmail());
        event.put("senderAvatar", sender.getAvatar());
        UserSocket.sendToUser(receiverId, event);

        return saved;
    }

    @Transactional
    public void acceptRequest(Long requestId, Long currentUserId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!PENDING.equals(request.getStatus())) {
            throw new RuntimeException("Already processed");
        }

        Long receiverId = request.getReceiver().getId();
        if (!receiverId.equals(currentUserId)) {
            throw new RuntimeException("Not authorized to accept this request");
        }

        Long senderId = request.getSender().getId();

        friendsRepository.save(new Friends(new FriendsId(senderId, receiverId), null));
        friendsRepository.save(new Friends(new FriendsId(receiverId, senderId), null));

        boolean alreadyHasPrivateRoom = roomMemberRepository.findByIdUserId(senderId)
                .stream()
                .map(RoomMember::getRoom)
                .filter(room -> Boolean.TRUE.equals(room.getIsPrivate()))
                .anyMatch(room -> roomMemberRepository.findByIdRoomId(room.getId())
                        .stream()
                        .anyMatch(member -> member.getUser() != null && member.getUser().getId().equals(receiverId)));

        if (!alreadyHasPrivateRoom) {
            ChatRoom room = ChatRoom.builder()
                    .isPrivate(true)
                    .build();
            ChatRoom savedRoom = chatRoomRepository.save(room);

            roomMemberRepository.save(RoomMember.builder()
                    .id(new RoomMemberId(savedRoom.getId(), senderId))
                    .room(savedRoom)
                    .user(request.getSender())
                    .build());
            roomMemberRepository.save(RoomMember.builder()
                    .id(new RoomMemberId(savedRoom.getId(), receiverId))
                    .room(savedRoom)
                    .user(request.getReceiver())
                    .build());
        }

        List<FriendRequest> relatedRequests = friendRequestRepository
                .findBySender_IdAndReceiver_IdOrSender_IdAndReceiver_Id(senderId, receiverId, receiverId, senderId);
        if (!relatedRequests.isEmpty()) {
            friendRequestRepository.deleteAll(relatedRequests);
        }

        // Send real-time events to both users
        User sender = request.getSender();
        User receiver = request.getReceiver();

        Map<String, Object> eventToSender = new HashMap<>();
        eventToSender.put("type", "FRIEND_REQUEST_ACCEPTED");
        eventToSender.put("userId", receiverId);
        eventToSender.put("userName", receiver.getFullName());
        UserSocket.sendToUser(senderId, eventToSender);

        Map<String, Object> eventToReceiver = new HashMap<>();
        eventToReceiver.put("type", "FRIEND_REQUEST_ACCEPTED");
        eventToReceiver.put("userId", senderId);
        eventToReceiver.put("userName", sender.getFullName());
        UserSocket.sendToUser(receiverId, eventToReceiver);
    }

    @Transactional
    public void rejectRequest(Long requestId, Long currentUserId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!PENDING.equals(request.getStatus())) {
            throw new RuntimeException("Request already processed");
        }

        Long receiverId = request.getReceiver().getId();
        if (!receiverId.equals(currentUserId)) {
            throw new RuntimeException("Not authorized to reject this request");
        }

        Long senderId = request.getSender().getId();

        request.setStatus(REJECTED);
        friendRequestRepository.save(request);

        // Send real-time event to sender
        Map<String, Object> event = new HashMap<>();
        event.put("type", "FRIEND_REQUEST_REJECTED");
        event.put("userId", receiverId);
        event.put("userName", request.getReceiver().getFullName());
        UserSocket.sendToUser(senderId, event);
    }

    public List<FriendResponse> getFriends(Long userId) {
        List<Friends> friends = friendsRepository.findByIdUserId(userId);
        return friends.stream()
                .map(f -> {
                    User friendUser = userRepository.findById(f.getId().getFriendId()).orElseThrow();
                    return FriendResponse.builder()
                            .id(friendUser.getId())
                            .email(friendUser.getEmail())
                            .fullName(friendUser.getFullName())
                            .avatar(friendUser.getAvatar())
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<FriendRequest> getPendingRequests(Long userId) {
        return friendRequestRepository.findByReceiver_IdAndStatus(userId, PENDING);
    }

    @Transactional
    public void unfriend(Long userId, Long friendId) {
        friendsRepository.deleteByIdUserIdAndIdFriendId(userId, friendId);
        friendsRepository.deleteByIdUserIdAndIdFriendId(friendId, userId);

        Map<String, Object> event = new HashMap<>();
        event.put("type", "FRIEND_REMOVED");
        event.put("userId", friendId);
        UserSocket.sendToUser(userId, event);

        Map<String, Object> eventToFriend = new HashMap<>();
        eventToFriend.put("type", "FRIEND_REMOVED");
        eventToFriend.put("userId", userId);
        UserSocket.sendToUser(friendId, eventToFriend);
    }
}
