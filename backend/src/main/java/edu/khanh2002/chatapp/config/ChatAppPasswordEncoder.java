package edu.khanh2002.chatapp.config;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class ChatAppPasswordEncoder implements PasswordEncoder {

    private final PasswordEncoder bcryptEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    @Override
    public String encode(CharSequence rawPassword) {
        return bcryptEncoder.encode(rawPassword);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isBlank()) {
            return false;
        }

        if (isBCrypt(encodedPassword)) {
            return bcryptEncoder.matches(rawPassword, encodedPassword);
        }

        return rawPassword.toString().equals(encodedPassword);
    }

    private boolean isBCrypt(String password) {
        return password != null && password.startsWith("$2a$");
    }
}
