package edu.khanh2002.chatapp.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserSearchResponse {

    private long id;
    private String email;
    private String fullName;
    private String avatar;
}
