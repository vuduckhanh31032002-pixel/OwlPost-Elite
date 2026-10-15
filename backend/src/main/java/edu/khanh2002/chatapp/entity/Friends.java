package edu.khanh2002.chatapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "friends")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Friends {

    @EmbeddedId
    private FriendsId id;

    private LocalDateTime createdAt = LocalDateTime.now();
}
