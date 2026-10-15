package edu.khanh2002.chatapp.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "roomId")
    @JsonIgnoreProperties({"members", "messages"})
    private ChatRoom room;

    @ManyToOne
    @JoinColumn(name = "senderId")
    private User sender;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replyToId")
    @JsonIgnoreProperties({"room", "sender", "replyTo"})
    private Message replyTo;

    @Column(nullable = false)
    private boolean pinned = false;

    @Column(nullable = false)
    private boolean unsent = false;

    @Column(nullable = false)
    private LocalDateTime sentTime;

    @PrePersist
    public void prePersist() {
        this.sentTime = LocalDateTime.now();
    }
}