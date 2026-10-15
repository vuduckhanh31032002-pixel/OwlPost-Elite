package edu.khanh2002.chatapp.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendResponse {

    private Long id;
    private String email;
    private String fullName;
    private String avatar;
}