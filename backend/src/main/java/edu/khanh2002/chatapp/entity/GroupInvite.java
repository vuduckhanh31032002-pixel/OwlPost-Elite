package edu.khanh2002.chatapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "groupinvites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "roomId", nullable = false)
    private ChatRoom room;

    @ManyToOne
    @JoinColumn(name = "senderId", nullable = false)
    private User sender;

    @ManyToOne
    @JoinColumn(name = "receiverId", nullable = false)
    private User receiver;

    private String status;

    private LocalDateTime createdAt = LocalDateTime.now();
}