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
public class RoomMemberId implements Serializable {

    private Long roomId;
    private Long userId;
}