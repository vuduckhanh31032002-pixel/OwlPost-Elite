package edu.khanh2002.chatapp.service;

import edu.khanh2002.chatapp.config.JwtUtil;
import edu.khanh2002.chatapp.entity.User;
import edu.khanh2002.chatapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private UserService userService;

    @Test
    void register_ShouldSaveUserAndEncodePassword() {
        User user = User.builder()
                .email("test@example.com")
                .password("plaintext")
                .fullName("Test User")
                .username("testuser")
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("plaintext")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = userService.register(user);

        assertNotNull(result);
        assertEquals("test@example.com", result.getUser().getEmail());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_ShouldThrowWhenEmailExists() {
        User existing = User.builder().id(1L).email("test@example.com").build();
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(existing));

        User user = User.builder()
                .email("test@example.com")
                .password("pass")
                .fullName("Test")
                .username("test")
                .build();

        assertThrows(RuntimeException.class, () -> userService.register(user));
    }

    @Test
    void login_ShouldReturnUserWhenCredentialsValid() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("$2a$encoded")
                .fullName("Test User")
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass", "$2a$encoded")).thenReturn(true);
        when(jwtUtil.generateToken(1L, "test@example.com")).thenReturn("jwt-token");

        var result = userService.login("test@example.com", "pass");

        assertNotNull(result);
        assertEquals("jwt-token", result.getToken());
        assertEquals("Test User", result.getUser().getFullName());
    }

    @Test
    void login_ShouldThrowWhenUserNotFound() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> userService.login("unknown@example.com", "pass"));
    }

    @Test
    void login_ShouldThrowWhenPasswordInvalid() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("$2a$encoded")
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "$2a$encoded")).thenReturn(false);

        assertThrows(RuntimeException.class, () -> userService.login("test@example.com", "wrong"));
    }
}
