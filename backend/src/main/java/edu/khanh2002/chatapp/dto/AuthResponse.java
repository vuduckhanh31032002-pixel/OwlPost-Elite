package edu.khanh2002.chatapp.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {

    private UserInfo user;
    private String token;

    @Data
    @Builder
    public static class UserInfo {
        private Long id;
        private String email;
        private String fullName;
        private String username;
        private String phoneNumber;
        private String dayOfBirth;
        private String monthOfBirth;
        private String yearOfBirth;
        private String avatar;
        private String authProvider;
    }
}
