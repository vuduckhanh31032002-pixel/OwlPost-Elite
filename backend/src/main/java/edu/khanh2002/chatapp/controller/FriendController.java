package edu.khanh2002.chatapp.controller;

import edu.khanh2002.chatapp.config.AuthUtil;
import edu.khanh2002.chatapp.dto.FriendResponse;
import edu.khanh2002.chatapp.entity.FriendRequest;
import edu.khanh2002.chatapp.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @PostMapping("/request")
    public FriendRequest sendRequest(@RequestParam Long receiverId) {
        Long senderId = AuthUtil.getCurrentUserId();
        return friendService.sendRequest(senderId, receiverId);
    }

    @PostMapping("/accept/{requestId}")
    public String accept(@PathVariable Long requestId) {
        Long userId = AuthUtil.getCurrentUserId();
        friendService.acceptRequest(requestId, userId);
        return "Accepted & Room Created";
    }

    @PostMapping("/reject/{requestId}")
    public String reject(@PathVariable Long requestId) {
        Long userId = AuthUtil.getCurrentUserId();
        friendService.rejectRequest(requestId, userId);
        return "Rejected";
    }

    @GetMapping
    public List<FriendResponse> getFriends() {
        Long userId = AuthUtil.getCurrentUserId();
        return friendService.getFriends(userId);
    }

    @GetMapping("/pending")
    public List<FriendRequest> getPending() {
        Long userId = AuthUtil.getCurrentUserId();
        return friendService.getPendingRequests(userId);
    }

    @DeleteMapping
    public String unfriend(@RequestParam Long friendId) {
        Long userId = AuthUtil.getCurrentUserId();
        friendService.unfriend(userId, friendId);
        return "Unfriended successfully";
    }
}
