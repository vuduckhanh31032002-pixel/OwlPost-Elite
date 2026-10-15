package edu.khanh2002.chatapp.controller;

import edu.khanh2002.chatapp.config.AuthUtil;
import edu.khanh2002.chatapp.dto.ChatRoomResponse;
import edu.khanh2002.chatapp.dto.CreateGroupRequest;
import edu.khanh2002.chatapp.entity.GroupInvite;
import edu.khanh2002.chatapp.service.ChatRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    @GetMapping
    public List<ChatRoomResponse> getUserRooms() {
        Long userId = AuthUtil.getCurrentUserId();
        return chatRoomService.getUserRooms(userId);
    }

    @PostMapping("/group")
    public Long createGroup(@Valid @RequestBody CreateGroupRequest request) {
        Long creatorId = AuthUtil.getCurrentUserId();
        request.setCreatorId(creatorId);
        return chatRoomService.createGroup(request);
    }

    @GetMapping("/invites")
    public List<GroupInvite> getInvites() {
        Long userId = AuthUtil.getCurrentUserId();
        return chatRoomService.getUserInvites(userId);
    }

    @PostMapping("/invites/accept/{inviteId}")
    public String acceptInvite(
            @PathVariable Long inviteId
    ) {
        chatRoomService.acceptInvite(inviteId);
        return "Joined group";
    }

    @DeleteMapping("/invites/reject/{inviteId}")
    public String rejectInvite(
            @PathVariable Long inviteId
    ) {
        chatRoomService.rejectInvite(inviteId);
        return "Invite rejected";
    }

    @PutMapping("/{roomId}/rename")
    public String renameGroup(
            @PathVariable Long roomId,
            @RequestParam String name
    ) {
        chatRoomService.renameGroup(roomId, name);
        return "Group renamed";
    }

    @PutMapping("/{roomId}/avatar")
    public String updateGroupAvatar(
            @PathVariable Long roomId,
            @RequestBody String avatar
    ) {
        chatRoomService.updateGroupAvatar(roomId, avatar);
        return "Avatar updated";
    }

    @PutMapping("/{roomId}/background")
    public String updateGroupBackground(
            @PathVariable Long roomId,
            @RequestBody String background
    ) {
        chatRoomService.updateGroupBackground(roomId, background);
        return "Background updated";
    }

    @DeleteMapping("/{roomId}/leave")
    public String leaveGroup(
            @PathVariable Long roomId
    ) {
        Long userId = AuthUtil.getCurrentUserId();
        chatRoomService.leaveGroup(roomId, userId);
        return "Left group";
    }

    @DeleteMapping("/{roomId}/delete")
    public String deleteConversation(
            @PathVariable Long roomId
    ) {
        Long userId = AuthUtil.getCurrentUserId();
        chatRoomService.deleteConversation(roomId, userId);
        return "Conversation deleted";
    }

    @PostMapping("/{roomId}/restore")
    public String restoreConversation(
            @PathVariable Long roomId
    ) {
        Long userId = AuthUtil.getCurrentUserId();
        chatRoomService.restoreConversation(roomId, userId);
        return "Conversation restored";
    }

    @DeleteMapping("/{roomId}/permanent")
    public String permanentlyDeleteConversation(
            @PathVariable Long roomId
    ) {
        Long userId = AuthUtil.getCurrentUserId();
        chatRoomService.permanentlyDeleteConversation(roomId, userId);
        return "Conversation permanently deleted";
    }

    @GetMapping("/deleted")
    public List<ChatRoomResponse> getDeletedRooms() {
        Long userId = AuthUtil.getCurrentUserId();
        return chatRoomService.getDeletedRooms(userId);
    }

    @PostMapping("/private")
    public Long createPrivateRoom(
            @RequestParam Long user2Id
    ) {
        Long user1Id = AuthUtil.getCurrentUserId();
        return chatRoomService.createPrivateRoom(user1Id, user2Id);
    }

    @GetMapping("/find-private")
    public ChatRoomResponse findPrivateRoom(
            @RequestParam Long user2Id
    ) {
        Long user1Id = AuthUtil.getCurrentUserId();
        return chatRoomService.findActivePrivateRoomResponse(user1Id, user2Id);
    }
}