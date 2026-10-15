package edu.khanh2002.chatapp.entity;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class FriendsId implements Serializable {

    private Long userId;
    private Long friendId;
}