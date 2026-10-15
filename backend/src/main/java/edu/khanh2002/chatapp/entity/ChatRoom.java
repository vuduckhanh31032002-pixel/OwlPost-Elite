package edu.khanh2002.chatapp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "chatrooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Boolean isPrivate = true;

    private String groupName;

    @Column(name = "\"groupAvatar\"", columnDefinition = "TEXT")
    private String groupAvatar;

    @Column(name = "\"groupBackground\"", columnDefinition = "TEXT")
    private String groupBackground;

    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "room")
    @JsonIgnore
    private List<RoomMember> members;

    @OneToMany(mappedBy = "room")
    @JsonIgnore
    private List<Message> messages;
}