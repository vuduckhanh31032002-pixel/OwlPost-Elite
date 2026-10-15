package edu.khanh2002.chatapp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roommembers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomMember {

    @EmbeddedId
    private RoomMemberId id;

    @ManyToOne
    @MapsId("roomId")
    @JoinColumn(name = "roomId")
    @JsonIgnore
    private ChatRoom room;

    @ManyToOne
    @MapsId("userId")
    @JoinColumn(name = "userId")
    private User user;

    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;
}
