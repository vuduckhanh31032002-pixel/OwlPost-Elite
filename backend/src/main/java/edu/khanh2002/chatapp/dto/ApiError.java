package edu.khanh2002.chatapp.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ApiError {

    private int status;
    private String error;
    private String message;
    private Map<String, String> details;
}
