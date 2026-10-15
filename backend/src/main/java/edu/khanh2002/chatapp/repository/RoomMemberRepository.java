package edu.khanh2002.chatapp.repository;

import edu.khanh2002.chatapp.entity.RoomMember;
import edu.khanh2002.chatapp.entity.RoomMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, RoomMemberId> {

    List<RoomMember> findByIdUserId(Long userId);

    List<RoomMember> findByIdRoomId(Long roomId);

    boolean existsById(RoomMemberId id);

    @Query("SELECT rm FROM RoomMember rm JOIN FETCH rm.room WHERE rm.id.userId = :userId AND rm.deleted = false")
    List<RoomMember> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT rm FROM RoomMember rm JOIN FETCH rm.room JOIN FETCH rm.user WHERE rm.id.roomId IN (:roomIds)")
    List<RoomMember> findByIdRoomIdIn(@Param("roomIds") java.util.Set<Long> roomIds);

    @Query("SELECT rm FROM RoomMember rm WHERE rm.id.userId = :userId AND rm.deleted = true")
    List<RoomMember> findDeletedByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE RoomMember rm SET rm.deleted = true WHERE rm.id.roomId = :roomId AND rm.id.userId = :userId")
    void softDelete(@Param("roomId") Long roomId, @Param("userId") Long userId);

    @Modifying
    @Query("UPDATE RoomMember rm SET rm.deleted = false WHERE rm.id.roomId = :roomId AND rm.id.userId = :userId")
    void restore(@Param("roomId") Long roomId, @Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM RoomMember rm WHERE rm.id.roomId = :roomId")
    void deleteAllByRoomId(@Param("roomId") Long roomId);
}
