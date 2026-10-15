package edu.khanh2002.chatapp.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MessageResponse {

    private Long id;
    private Long roomId;
    private SenderInfo sender;
    private String content;
    private String imageUrl;
    private String sentTime;

    @Data
    @Builder
    public static class SenderInfo {
        private Long id;
        private String fullName;
        private String avatar;
    }
}
