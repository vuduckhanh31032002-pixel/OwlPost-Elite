package edu.khanh2002.chatapp.repository;

import edu.khanh2002.chatapp.entity.BlockedUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlockedUserRepository extends JpaRepository<BlockedUser, Long> {

    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    @Modifying
    @Query("DELETE FROM BlockedUser b WHERE b.blockerId = :blockerId AND b.blockedId = :blockedId")
    void deleteByBlockerIdAndBlockedId(@Param("blockerId") Long blockerId, @Param("blockedId") Long blockedId);

    List<BlockedUser> findByBlockerId(Long blockerId);
}
