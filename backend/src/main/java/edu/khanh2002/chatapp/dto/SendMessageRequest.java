package edu.khanh2002.chatapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendMessageRequest {

    @NotNull(message = "roomId không được để trống")
    private Long roomId;

    @NotNull(message = "senderId không được để trống")
    private Long senderId;

    private String content;

    private String imageUrl;
}
