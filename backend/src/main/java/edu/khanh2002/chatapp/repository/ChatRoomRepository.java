package edu.khanh2002.chatapp.repository;

import edu.khanh2002.chatapp.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("SELECT rm.room FROM RoomMember rm WHERE rm.id.userId = :user1Id AND rm.deleted = false " +
           "AND rm.room.isPrivate = true " +
           "AND EXISTS (SELECT rm2 FROM RoomMember rm2 WHERE rm2.room = rm.room AND rm2.id.userId = :user2Id)")
    Optional<ChatRoom> findActivePrivateRoom(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    @Query("SELECT rm.room FROM RoomMember rm WHERE rm.id.userId = :user1Id " +
           "AND rm.room.isPrivate = true " +
           "AND rm.room.id <> :excludeRoomId " +
           "AND EXISTS (SELECT rm2 FROM RoomMember rm2 WHERE rm2.room = rm.room AND rm2.id.userId = :user2Id)")
    List<ChatRoom> findOtherPrivateRoomsBetween(@Param("user1Id") Long user1Id,
                                                @Param("user2Id") Long user2Id,
                                                @Param("excludeRoomId") Long excludeRoomId);
}