package edu.khanh2002.chatapp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(length = 100)
    private String username;

    @Column(length = 30)
    private String phoneNumber;

    @Column(length = 32)
    private String dayOfBirth;

    @Column(length = 32)
    private String monthOfBirth;

    @Column(length = 255)
    private String yearOfBirth;

    @Column(length = 2000000)
    private String avatar;

    @Column(length = 20)
    private String authProvider;

    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "sender")
    @JsonIgnore
    private List<FriendRequest> sentRequests;

    @OneToMany(mappedBy = "receiver")
    @JsonIgnore
    private List<FriendRequest> receivedRequests;

    @OneToMany(mappedBy = "sender")
    @JsonIgnore
    private List<Message> messages;

    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<RoomMember> roomMembers;
}
