package edu.khanh2002.chatapp.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ChatRoomResponse {

    private Long roomId;
    private Boolean isPrivate;
    private List<MemberInfo> members;
    private String groupName;
    private String groupAvatar;
    private String groupBackground;
    private String lastMessage;
    private LocalDateTime lastMessageTime;

    @Data
    @Builder
    public static class MemberInfo {
        private Long id;
        private String fullName;
        private String avatar;
    }
}
