package edu.khanh2002.chatapp.controller;

import edu.khanh2002.chatapp.dto.AuthResponse;
import edu.khanh2002.chatapp.dto.GoogleLoginRequest;
import edu.khanh2002.chatapp.dto.LoginRequest;
import edu.khanh2002.chatapp.dto.RegisterRequest;
import edu.khanh2002.chatapp.dto.UserSearchResponse;
import edu.khanh2002.chatapp.entity.User;
import edu.khanh2002.chatapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        return userService.register(user);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return userService.login(
                request.getEmail(),
                request.getPassword()
        );
    }

    @PostMapping("/google-login")
    public AuthResponse googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return userService.loginWithGoogle(request.getIdToken());
    }

    @GetMapping("/search")
    public List<UserSearchResponse> searchUsers(
            @RequestParam String keyword,
            @RequestParam(required = false) Long currentUserId
    ) {
        return userService.search(keyword, currentUserId);
    }

    @PutMapping("/{id}")
    public User updateUser(
            @PathVariable Long id,
            @RequestBody User updatedUser
    ) {
        return userService.updateUser(id, updatedUser);
    }

    @PostMapping("/block")
    public String blockUser(@RequestParam Long blockerId, @RequestParam Long blockedId) {
        userService.blockUser(blockerId, blockedId);
        return "User blocked";
    }

    @DeleteMapping("/block")
    public String unblockUser(@RequestParam Long blockerId, @RequestParam Long blockedId) {
        userService.unblockUser(blockerId, blockedId);
        return "User unblocked";
    }

    @GetMapping("/block-status")
    public java.util.Map<String, Boolean> getBlockStatus(@RequestParam Long userId, @RequestParam Long otherUserId) {
        return userService.getBlockStatus(userId, otherUserId);
    }

    @GetMapping("/blocked/{userId}")
    public java.util.List<edu.khanh2002.chatapp.dto.FriendResponse> getBlockedUsers(@PathVariable Long userId) {
        return userService.getBlockedUsers(userId);
    }
}
