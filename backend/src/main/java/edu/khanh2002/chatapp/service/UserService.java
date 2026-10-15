package edu.khanh2002.chatapp.service;
import java.util.HashMap;

import edu.khanh2002.chatapp.config.JwtUtil;
import edu.khanh2002.chatapp.dto.AuthResponse;
import edu.khanh2002.chatapp.dto.UserSearchResponse;
import edu.khanh2002.chatapp.entity.BlockedUser;
import edu.khanh2002.chatapp.entity.User;
import edu.khanh2002.chatapp.repository.BlockedUserRepository;
import edu.khanh2002.chatapp.repository.UserRepository;
import edu.khanh2002.chatapp.websocket.UserSocket;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @org.springframework.beans.factory.annotation.Value("${google.oauth.tokeninfo-url:https://oauth2.googleapis.com/tokeninfo}")
    private String googleTokenInfoUrl;

    @org.springframework.beans.factory.annotation.Value("${google.oauth.client-id:}")
    private String googleClientId;

    public AuthResponse register(User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        user.setFullName(Normalizer.normalize(user.getFullName(), Normalizer.Form.NFC));
        if (user.getUsername() != null) {
            user.setUsername(user.getUsername().trim());
        }

        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        User saved = userRepository.save(user);
        String token = jwtUtil.generateToken(saved.getId(), saved.getEmail());
        return buildAuthResponse(saved, token);
    }

    public AuthResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Wrong password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return buildAuthResponse(user, token);
    }

    public AuthResponse loginWithGoogle(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new RuntimeException("Invalid Google token");
        }

        RestTemplate restTemplate = new RestTemplate();

        String url = googleTokenInfoUrl + "?id_token=" + idToken;
        ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                HttpEntity.EMPTY,
                Map.class
        );

        Map body = response.getBody();
        if (body == null || body.get("email") == null) {
            throw new RuntimeException("Cannot get email from Google token");
        }

        if (googleClientId != null && !googleClientId.isBlank()) {
            Object aud = body.get("aud");
            if (aud == null || !googleClientId.equals(aud.toString())) {
                throw new RuntimeException("Google token audience mismatch");
            }
        }

        String email = body.get("email").toString();
        String fullName = body.get("name") != null ? body.get("name").toString() : email;
        String avatar = body.get("picture") != null ? body.get("picture").toString() : null;

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .fullName(Normalizer.normalize(fullName, Normalizer.Form.NFC))
                    .avatar(avatar)
                    .authProvider("GOOGLE")
                    .phoneNumber(null)
                    .build();

            return userRepository.save(newUser);
        });

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return buildAuthResponse(user, token);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .username(user.getUsername())
                        .phoneNumber(user.getPhoneNumber())
                        .dayOfBirth(user.getDayOfBirth())
                        .monthOfBirth(user.getMonthOfBirth())
                        .yearOfBirth(user.getYearOfBirth())
                        .avatar(user.getAvatar())
                        .authProvider(user.getAuthProvider())
                        .build())
                .build();
    }

    public List<UserSearchResponse> search(String keyword, Long currentUserId) {
        Long excludeId = currentUserId != null ? currentUserId : -1L;
        return userRepository
                .searchUsers(keyword, excludeId)
                .stream()
                .map(user -> UserSearchResponse.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .avatar(user.getAvatar())
                        .build()
                )
                .toList();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUser(Long id, User updatedUser) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Email and Username are NOT allowed to change - keep original values

        if (updatedUser.getFullName() != null) {
            user.setFullName(Normalizer.normalize(updatedUser.getFullName(), Normalizer.Form.NFC));
        }

        if (updatedUser.getPhoneNumber() != null) {
            user.setPhoneNumber(updatedUser.getPhoneNumber().trim());
        }

        if (updatedUser.getDayOfBirth() != null) {
            user.setDayOfBirth(updatedUser.getDayOfBirth());
        }

        if (updatedUser.getMonthOfBirth() != null) {
            user.setMonthOfBirth(updatedUser.getMonthOfBirth());
        }

        if (updatedUser.getYearOfBirth() != null) {
            user.setYearOfBirth(updatedUser.getYearOfBirth());
        }

        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        }

        if (updatedUser.getAvatar() != null && !updatedUser.getAvatar().isEmpty()) {
            user.setAvatar(updatedUser.getAvatar());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void blockUser(Long blockerId, Long blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new RuntimeException("Cannot block yourself");
        }
        if (!blockedUserRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) {
            blockedUserRepository.save(BlockedUser.builder()
                    .blockerId(blockerId)
                    .blockedId(blockedId)
                    .build());
        }

        Map<String, Object> eventToBlocked = new HashMap<>();
        eventToBlocked.put("type", "USER_BLOCKED");
        eventToBlocked.put("blockerId", blockerId);
        UserSocket.sendToUser(blockedId, eventToBlocked);

        Map<String, Object> eventToBlocker = new HashMap<>();
        eventToBlocker.put("type", "USER_BLOCKED_BY");
        eventToBlocker.put("blockedId", blockedId);
        UserSocket.sendToUser(blockerId, eventToBlocker);
    }

    @Transactional
    public void unblockUser(Long blockerId, Long blockedId) {
        blockedUserRepository.deleteByBlockerIdAndBlockedId(blockerId, blockedId);

        Map<String, Object> eventToBlocked = new HashMap<>();
        eventToBlocked.put("type", "USER_UNBLOCKED");
        eventToBlocked.put("blockerId", blockerId);
        UserSocket.sendToUser(blockedId, eventToBlocked);

        Map<String, Object> eventToBlocker = new HashMap<>();
        eventToBlocker.put("type", "USER_UNBLOCKED_BY");
        eventToBlocker.put("blockedId", blockedId);
        UserSocket.sendToUser(blockerId, eventToBlocker);
    }

    public java.util.Map<String, Boolean> getBlockStatus(Long userId, Long otherUserId) {
        boolean iBlocked = blockedUserRepository.existsByBlockerIdAndBlockedId(userId, otherUserId);
        boolean blockedBy = blockedUserRepository.existsByBlockerIdAndBlockedId(otherUserId, userId);
        return java.util.Map.of(
            "iBlocked", iBlocked,
            "blockedBy", blockedBy
        );
    }

    public java.util.List<edu.khanh2002.chatapp.dto.FriendResponse> getBlockedUsers(Long userId) {
        return blockedUserRepository.findByBlockerId(userId).stream()
            .map(blocked -> {
                User blockedUser = userRepository.findById(blocked.getBlockedId()).orElse(null);
                if (blockedUser == null) return null;
                return edu.khanh2002.chatapp.dto.FriendResponse.builder()
                    .id(blockedUser.getId())
                    .email(blockedUser.getEmail())
                    .fullName(blockedUser.getFullName())
                    .avatar(blockedUser.getAvatar())
                    .build();
            })
            .filter(java.util.Objects::nonNull)
            .collect(java.util.stream.Collectors.toList());
    }
}
