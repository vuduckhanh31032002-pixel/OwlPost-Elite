package edu.khanh2002.chatapp.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class AuthUtil {

    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getDetails() == null) {
            throw new RuntimeException("User not authenticated");
        }

        Object details = authentication.getDetails();
        if (details instanceof java.util.Map) {
            Object userIdObj = ((java.util.Map<?, ?>) details).get("userId");
            if (userIdObj instanceof Number) {
                return ((Number) userIdObj).longValue();
            }
            if (userIdObj != null) {
                return Long.parseLong(userIdObj.toString());
            }
        }
        throw new RuntimeException("User not authenticated");
    }
}