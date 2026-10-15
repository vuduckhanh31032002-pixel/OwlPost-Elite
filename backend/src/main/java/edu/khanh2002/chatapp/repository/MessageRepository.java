package edu.khanh2002.chatapp.repository;
import edu.khanh2002.chatapp.entity.ChatRoom;

import edu.khanh2002.chatapp.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("""
        select m
        from Message m
        left join fetch m.sender
        left join fetch m.replyTo rt
        left join fetch rt.sender
        where m.room.id = :roomId
        order by m.sentTime asc
    """)
    List<Message> findByRoom_IdOrderBySentTimeAsc(@Param("roomId") Long roomId);

    @Query("""
        select m
        from Message m
        left join fetch m.sender
        left join fetch m.replyTo rt
        left join fetch rt.sender
        where m.room.id = :roomId
          and (:lastId is null or m.id < :lastId)
        order by m.id desc
    """)
    List<Message> findRecentByRoomId(@Param("roomId") Long roomId, @Param("lastId") Long lastId, Pageable pageable);

    Optional<Message> findTopByRoom_IdOrderBySentTimeDesc(Long roomId);

    @Query("""
        SELECT m FROM Message m
        WHERE m.id IN (
            SELECT MAX(m2.id) FROM Message m2 WHERE m2.room.id IN (:roomIds)
            GROUP BY m2.room.id
        )
        """)
    List<Message> findLatestByRoomIdIn(@Param("roomIds") java.util.Set<Long> roomIds);

    @Query("SELECT m FROM Message m WHERE m.room.id = :roomId ORDER BY m.sentTime ASC")
    List<Message> findAllByRoomId(@Param("roomId") Long roomId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Message m SET m.room = :newRoom WHERE m.room = :oldRoom")
    void updateRoomForMessages(@Param("oldRoom") ChatRoom oldRoom, @Param("newRoom") ChatRoom newRoom);
}
