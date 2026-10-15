package edu.khanh2002.chatapp.service;

import edu.khanh2002.chatapp.config.AuthUtil;
import edu.khanh2002.chatapp.dto.ChatRoomResponse;
import edu.khanh2002.chatapp.dto.CreateGroupRequest;
import edu.khanh2002.chatapp.entity.*;
import edu.khanh2002.chatapp.repository.*;
import edu.khanh2002.chatapp.websocket.UserSocket;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final RoomMemberRepository roomMemberRepository;
    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final GroupInviteRepository groupInviteRepository;

    private void verifyRoomMember(Long roomId, Long userId) {
        if (!roomMemberRepository.existsById(new RoomMemberId(roomId, userId))) {
            throw new RuntimeException("User not a member of this room");
        }
    }

    /*
    ==========================================================
    1️⃣ LẤY DANH SÁCH ROOM CỦA USER (CHỈ LẤY CHƯA XÓA)
    ==========================================================
     */
    public List<ChatRoomResponse> getUserRooms(Long userId) {

        List<RoomMember> memberships =
                roomMemberRepository.findActiveByUserId(userId);

        if (memberships.isEmpty()) {
            return new ArrayList<>();
        }

        // Collect all room IDs in one pass
        java.util.Set<Long> allRoomIds = new java.util.HashSet<>();
        for (RoomMember member : memberships) {
            allRoomIds.add(member.getRoom().getId());
        }

        // Batch load all RoomMembers for these rooms (JOIN FETCH user)
        List<RoomMember> allMembers =
                roomMemberRepository.findByIdRoomIdIn(allRoomIds);

        // Batch load latest message per room
        List<Message> latestMessages =
                messageRepository.findLatestByRoomIdIn(allRoomIds);

        // Index members by roomId
        java.util.Map<Long, List<RoomMember>> membersByRoom = new java.util.HashMap<>();
        for (RoomMember rm : allMembers) {
            membersByRoom
                    .computeIfAbsent(rm.getRoom().getId(), k -> new java.util.ArrayList<>())
                    .add(rm);
        }

        // Index latest message per room (first entry per room due to ORDER BY sentTime DESC)
        java.util.Map<Long, Message> latestByRoom = new java.util.HashMap<>();
        for (Message msg : latestMessages) {
            Long roomId = msg.getRoom().getId();
            if (!latestByRoom.containsKey(roomId)) {
                latestByRoom.put(roomId, msg);
            }
        }

        // Index memberships by room for the current user
        java.util.Map<Long, RoomMember> membershipByRoom = new java.util.HashMap<>();
        for (RoomMember member : memberships) {
            membershipByRoom.put(member.getRoom().getId(), member);
        }

        // For private rooms: map roomId -> otherUserId
        java.util.Map<Long, Long> roomIdToOtherUser = new java.util.HashMap<>();
        for (RoomMember rm : allMembers) {
            Long roomId = rm.getRoom().getId();
            Long uid = rm.getId().getUserId();
            if (!uid.equals(userId)) {
                roomIdToOtherUser.putIfAbsent(roomId, uid);
            }
        }

        java.util.Map<Long, Long> otherUserToBestRoomId = new java.util.HashMap<>();
        java.util.Map<Long, java.time.LocalDateTime> otherUserToBestRoomTime = new java.util.HashMap<>();

        // Determine best private room per other user (by latest message time)
        for (RoomMember member : memberships) {
            ChatRoom room = member.getRoom();
            Long roomId = room.getId();

            if (Boolean.TRUE.equals(room.getIsPrivate())) {
                Long otherId = roomIdToOtherUser.get(roomId);
                if (otherId == null) continue;

                Message latest = latestByRoom.get(roomId);
                java.time.LocalDateTime time = latest != null
                        ? latest.getSentTime()
                        : java.time.LocalDateTime.MIN;

                Long existingRoomId = otherUserToBestRoomId.get(otherId);
                if (existingRoomId == null) {
                    otherUserToBestRoomId.put(otherId, roomId);
                    otherUserToBestRoomTime.put(otherId, time);
                } else {
                    java.time.LocalDateTime existingTime = otherUserToBestRoomTime.get(otherId);
                    if (time.isAfter(existingTime)) {
                        otherUserToBestRoomId.put(otherId, roomId);
                        otherUserToBestRoomTime.put(otherId, time);
                    }
                }
            }
        }

        java.util.Map<Long, ChatRoomResponse> roomMap = new java.util.HashMap<>();
        java.util.Set<Long> processedRooms = new java.util.HashSet<>();

        // Process private rooms first (only the best one per other user)
        for (RoomMember member : memberships) {
            ChatRoom room = member.getRoom();
            Long roomId = room.getId();

            if (!Boolean.TRUE.equals(room.getIsPrivate())) continue;
            if (processedRooms.contains(roomId)) continue;

            Long otherId = roomIdToOtherUser.get(roomId);
            if (otherId == null) continue;

            Long bestRoomId = otherUserToBestRoomId.get(otherId);
            if (bestRoomId == null || !bestRoomId.equals(roomId)) continue;

            processedRooms.add(roomId);

            List<ChatRoomResponse.MemberInfo> memberInfos =
                    buildMemberInfos(membersByRoom.get(roomId), userId);

            Message latest = latestByRoom.get(roomId);

            ChatRoomResponse response = ChatRoomResponse.builder()
                    .roomId(roomId)
                    .isPrivate(room.getIsPrivate())
                    .groupName(room.getGroupName())
                    .groupAvatar(room.getGroupAvatar())
                    .groupBackground(room.getGroupBackground())
                    .members(memberInfos)
                    .lastMessage(latest != null ? latest.getContent() : null)
                    .lastMessageTime(latest != null ? latest.getSentTime() : null)
                    .build();

            roomMap.put(otherId, response);
        }

        // Process group rooms
        for (RoomMember member : memberships) {
            ChatRoom room = member.getRoom();
            Long roomId = room.getId();

            if (Boolean.TRUE.equals(room.getIsPrivate())) continue;
            if (processedRooms.contains(roomId)) continue;

            processedRooms.add(roomId);

            List<ChatRoomResponse.MemberInfo> memberInfos =
                    buildMemberInfos(membersByRoom.get(roomId), userId);

            Message latest = latestByRoom.get(roomId);

            ChatRoomResponse response = ChatRoomResponse.builder()
                    .roomId(roomId)
                    .isPrivate(room.getIsPrivate())
                    .groupName(room.getGroupName())
                    .groupAvatar(room.getGroupAvatar())
                    .groupBackground(room.getGroupBackground())
                    .members(memberInfos)
                    .lastMessage(latest != null ? latest.getContent() : null)
                    .lastMessageTime(latest != null ? latest.getSentTime() : null)
                    .build();

            roomMap.put(-roomId, response);
        }

        return new ArrayList<>(roomMap.values());
    }

    /*
    ==========================================================
    1️⃣b LẤY DANH SÁCH ROOM ĐÃ XÓA CỦA USER
    ==========================================================
     */
    public List<ChatRoomResponse> getDeletedRooms(Long userId) {

        List<RoomMember> memberships =
                roomMemberRepository.findDeletedByUserId(userId);

        return memberships.stream().map(member -> {

            ChatRoom room = member.getRoom();
            Long roomId = room.getId();

            List<ChatRoomResponse.MemberInfo> memberInfos =
                    roomMemberRepository.findByIdRoomId(roomId)
                            .stream()
                            .filter(rm -> !rm.isDeleted())
                            .map(rm -> ChatRoomResponse.MemberInfo.builder()
                                    .id(rm.getUser().getId())
                                    .fullName(rm.getUser().getFullName())
                                    .avatar(rm.getUser().getAvatar())
                                    .build())
                            .collect(Collectors.toList());

            Optional<Message> lastMessage =
                    messageRepository.findTopByRoom_IdOrderBySentTimeDesc(roomId);

            return ChatRoomResponse.builder()
                    .roomId(roomId)
                    .isPrivate(room.getIsPrivate())
                    .groupName(room.getGroupName())
                    .groupAvatar(room.getGroupAvatar())
                    .groupBackground(room.getGroupBackground())
                    .members(memberInfos)
                    .lastMessage(
                            lastMessage.map(Message::getContent).orElse(null))
                    .lastMessageTime(
                            lastMessage.map(Message::getSentTime).orElse(null))
                    .build();

        }).collect(Collectors.toList());
    }

    /*
    ==========================================================
    2️⃣ TẠO GROUP (TẠO INVITE CHO MEMBER)
    ==========================================================
     */
    @Transactional
    public Long createGroup(CreateGroupRequest request) {

        ChatRoom room = ChatRoom.builder()
                .groupName(request.getGroupName())
                .isPrivate(false)
                .build();

        chatRoomRepository.save(room);

        // Người tạo auto join
        User creator = userRepository.findById(request.getCreatorId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        roomMemberRepository.save(
                RoomMember.builder()
                        .id(new RoomMemberId(room.getId(), creator.getId()))
                        .room(room)
                        .user(creator)
                        .build()
        );

        // Tạo invite cho các user khác
        for (Long userId : request.getMemberIds()) {

            if (userId.equals(request.getCreatorId())) continue;

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            GroupInvite invite = groupInviteRepository.save(
                    GroupInvite.builder()
                            .room(room)
                            .sender(creator)
                            .receiver(user)
                            .status("PENDING")
                            .build()
            );

            // Send real-time event to invited user
            Map<String, Object> event = new HashMap<>();
            event.put("type", "GROUP_INVITE_RECEIVED");
            event.put("inviteId", invite.getId());
            event.put("roomId", room.getId());
            event.put("roomName", room.getGroupName());
            event.put("senderId", creator.getId());
            event.put("senderName", creator.getFullName());
            UserSocket.sendToUser(userId, event);
        }

        return room.getId();
    }

    /*
    ==========================================================
    3️⃣ ACCEPT INVITE
    ==========================================================
     */
    @Transactional
    public void acceptInvite(Long inviteId) {

        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new RuntimeException("Invite not found"));

        Long currentUserId = AuthUtil.getCurrentUserId();
        if (!invite.getReceiver().getId().equals(currentUserId)) {
            throw new RuntimeException("Not authorized to accept this invite");
        }

        if (!invite.getStatus().equals("PENDING")) {
            throw new RuntimeException("Invite already handled");
        }

        invite.setStatus("ACCEPTED");

        roomMemberRepository.save(
                RoomMember.builder()
                        .id(new RoomMemberId(
                                invite.getRoom().getId(),
                                invite.getReceiver().getId()))
                        .room(invite.getRoom())
                        .user(invite.getReceiver())
                        .build()
        );
    }

    @Transactional
    public void rejectInvite(Long inviteId) {

        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new RuntimeException("Invite not found"));

        Long currentUserId = AuthUtil.getCurrentUserId();
        if (!invite.getReceiver().getId().equals(currentUserId)) {
            throw new RuntimeException("Not authorized to reject this invite");
        }

        if (!invite.getStatus().equals("PENDING")) {
            throw new RuntimeException("Invite already handled");
        }

        invite.setStatus("REJECTED");
        groupInviteRepository.save(invite);
    }

    /*
    ==========================================================
    4️⃣ LẤY DANH SÁCH INVITE
    ==========================================================
     */
    public List<GroupInvite> getUserInvites(Long userId) {
        return groupInviteRepository
                .findByReceiver_IdAndStatus(userId, "PENDING");
    }

    /*
    ==========================================================
    5️⃣ ĐỔI TÊN GROUP
    ==========================================================
     */
    @Transactional
    public void renameGroup(Long roomId, String newName) {

        Long currentUserId = AuthUtil.getCurrentUserId();
        verifyRoomMember(roomId, currentUserId);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if (Boolean.TRUE.equals(room.getIsPrivate())) {
            throw new RuntimeException("Cannot rename private chat");
        }

        room.setGroupName(newName);
    }

    /*
    ==========================================================
    6️⃣ RỜI GROUP
    ==========================================================
     */
    @Transactional
    public void leaveGroup(Long roomId, Long userId) {

        RoomMemberId id = new RoomMemberId(roomId, userId);

        if (!roomMemberRepository.existsById(id)) {
            throw new RuntimeException("User not in group");
        }

        roomMemberRepository.deleteById(id);
    }

    /*
    ==========================================================
    7️⃣ CẬP NHẬT AVATAR NHÓM
    ==========================================================
     */
    @Transactional
    public void updateGroupAvatar(Long roomId, String avatar) {

        Long currentUserId = AuthUtil.getCurrentUserId();
        verifyRoomMember(roomId, currentUserId);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if (Boolean.TRUE.equals(room.getIsPrivate())) {
            throw new RuntimeException("Cannot change avatar for private chat");
        }

        room.setGroupAvatar(avatar);
    }

    /*
    ==========================================================
    8️⃣ CẬP NHẬT BACKGROUND NHÓM
    ==========================================================
     */
    @Transactional
    public void updateGroupBackground(Long roomId, String background) {

        Long currentUserId = AuthUtil.getCurrentUserId();
        verifyRoomMember(roomId, currentUserId);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        String normalizedBackground = (background == null || background.isBlank()) ? null : background;
        room.setGroupBackground(normalizedBackground);

        List<RoomMember> members = roomMemberRepository.findByIdRoomId(roomId);
        for (RoomMember member : members) {
            Long memberId = member.getId().getUserId();
            if (memberId.equals(currentUserId)) continue;

            Map<String, Object> event = new HashMap<>();
            event.put("type", "ROOM_BACKGROUND_CHANGED");
            event.put("roomId", roomId);
            event.put("background", normalizedBackground);
            UserSocket.sendToUser(memberId, event);
        }
    }

    /*
    ==========================================================
    9️⃣ XÓA CUỘC HỘI THOẠI (SOFT DELETE - chỉ ẩn khỏi user)
    ==========================================================
     */
    @Transactional
    public void deleteConversation(Long roomId, Long userId) {

        RoomMemberId id = new RoomMemberId(roomId, userId);

        if (!roomMemberRepository.existsById(id)) {
            throw new RuntimeException("User not in conversation");
        }

        roomMemberRepository.softDelete(roomId, userId);
    }

    /*
    ==========================================================
    🔟 KHÔI PHỤC CUỘC HỘI THOẠI ĐÃ XÓA
       Nếu trong lúc room cũ bị xóa, user đã tạo room mới
       với cùng đối phương (private), merge message newRoom
       vào oldRoom rồi xóa newRoom hoàn toàn.
    ==========================================================
     */
    @Transactional
    public void restoreConversation(Long oldRoomId, Long userId) {

        RoomMemberId id = new RoomMemberId(oldRoomId, userId);
        if (!roomMemberRepository.existsById(id)) {
            throw new RuntimeException("Conversation not found");
        }

        ChatRoom oldRoom = chatRoomRepository.findById(oldRoomId)
                .orElseThrow(() -> {
                    return new RuntimeException("Room not found");
                });

        Long otherUserId = null;
        if (Boolean.TRUE.equals(oldRoom.getIsPrivate())) {
            otherUserId = roomMemberRepository.findByIdRoomId(oldRoomId).stream()
                    .map(rm -> rm.getId().getUserId())
                    .filter(uid -> !uid.equals(userId))
                    .findFirst()
                    .orElse(null);
        }

        if (otherUserId != null) {
            try {
                List<ChatRoom> otherPrivateRooms = chatRoomRepository
                        .findOtherPrivateRoomsBetween(userId, otherUserId, oldRoomId);

                for (ChatRoom newRoom : otherPrivateRooms) {
                    mergeRooms(oldRoom, newRoom);
                }
            } catch (Exception e) {
                e.printStackTrace();
                throw e;
            }
        }

        roomMemberRepository.restore(oldRoomId, userId);

        if (otherUserId != null) {
            try {
                Map<String, Object> event = new HashMap<>();
                event.put("type", "ROOMS_CHANGED");
                event.put("reason", "MERGE_AFTER_RESTORE");
                event.put("keptRoomId", oldRoomId);
                UserSocket.sendToUser(otherUserId, event);
            } catch (Exception ignored) {}
        }
    }

    /*
    ==========================================================
    🔟b HỢP NHẤT MESSAGE newRoom -> oldRoom, XÓA newRoom
       Thứ tự an toàn với FK:
         1. Move message newRoom → oldRoom (bulk UPDATE)
         2. Bulk DELETE RoomMember của newRoom (KHÔNG load entity → không có stale ref)
         3. Bulk DELETE ChatRoom newRoom
         4. Flush từng bước
    ==========================================================
     */
    private void mergeRooms(ChatRoom oldRoom, ChatRoom newRoom) {
        if (oldRoom.getId().equals(newRoom.getId())) return;

        List<Message> newRoomMessages = messageRepository.findAllByRoomId(newRoom.getId());

        if (!newRoomMessages.isEmpty()) {
            messageRepository.updateRoomForMessages(newRoom, oldRoom);
            messageRepository.flush();
        }

        roomMemberRepository.deleteAllByRoomId(newRoom.getId());
        roomMemberRepository.flush();

        chatRoomRepository.delete(newRoom);
        chatRoomRepository.flush();
    }

    /*
    ==========================================================
    1️⃣1️⃣ XÓA VĨNH VIỄN CUỘC HỘI THOẠI (HARD DELETE)
    ==========================================================
     */
    @Transactional
    public void permanentlyDeleteConversation(Long roomId, Long userId) {

        RoomMemberId id = new RoomMemberId(roomId, userId);

        if (!roomMemberRepository.existsById(id)) {
            throw new RuntimeException("Conversation not found");
        }

        roomMemberRepository.deleteById(id);
    }

    /*
    ==========================================================
    1️⃣2️⃣ TẠO PRIVATE ROOM MỚI GIỮA 2 USER
    ==========================================================
     */
    @Transactional
    public Long createPrivateRoom(Long user1Id, Long user2Id) {

        ChatRoom room = ChatRoom.builder()
                .isPrivate(true)
                .build();
        ChatRoom savedRoom = chatRoomRepository.save(room);

        User user1 = userRepository.findById(user1Id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User user2 = userRepository.findById(user2Id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        roomMemberRepository.save(RoomMember.builder()
                .id(new RoomMemberId(savedRoom.getId(), user1Id))
                .room(savedRoom)
                .user(user1)
                .deleted(false)
                .build());

        roomMemberRepository.save(RoomMember.builder()
                .id(new RoomMemberId(savedRoom.getId(), user2Id))
                .room(savedRoom)
                .user(user2)
                .deleted(true)
                .build());

        return savedRoom.getId();
    }

    /*
    ==========================================================
    1️⃣3️⃣ TÌM PRIVATE ROOM ĐANG HOẠT ĐỘNG GIỮA 2 USER
    ==========================================================
     */
    public Optional<ChatRoom> findActivePrivateRoom(Long user1Id, Long user2Id) {
        return chatRoomRepository.findActivePrivateRoom(user1Id, user2Id);
    }

    public ChatRoomResponse findActivePrivateRoomResponse(Long user1Id, Long user2Id) {
        return chatRoomRepository.findActivePrivateRoom(user1Id, user2Id)
                .map(room -> {
                    List<ChatRoomResponse.MemberInfo> members = roomMemberRepository.findByIdRoomId(room.getId())
                            .stream()
                            .filter(rm -> !rm.isDeleted())
                            .map(rm -> ChatRoomResponse.MemberInfo.builder()
                                    .id(rm.getUser().getId())
                                    .fullName(rm.getUser().getFullName())
                                    .avatar(rm.getUser().getAvatar())
                                    .build())
                            .collect(Collectors.toList());

                    return ChatRoomResponse.builder()
                            .roomId(room.getId())
                            .isPrivate(room.getIsPrivate())
                            .groupName(room.getGroupName())
                            .groupAvatar(room.getGroupAvatar())
                            .groupBackground(room.getGroupBackground())
                            .members(members)
                            .build();
                })
                .orElse(null);
    }

    private List<ChatRoomResponse.MemberInfo> buildMemberInfos(
            List<RoomMember> members, Long currentUserId) {
        if (members == null) return new ArrayList<>();
        return members.stream()
                .map(rm -> ChatRoomResponse.MemberInfo.builder()
                        .id(rm.getUser().getId())
                        .fullName(rm.getUser().getFullName())
                        .avatar(rm.getUser().getAvatar())
                        .build())
                .collect(Collectors.toList());
    }
}

