package edu.khanh2002.chatapp.repository;

import edu.khanh2002.chatapp.entity.Friends;
import edu.khanh2002.chatapp.entity.FriendsId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendsRepository extends JpaRepository<Friends, FriendsId> {

    List<Friends> findByIdUserId(Long userId);

    boolean existsByIdUserIdAndIdFriendId(Long userId, Long friendId);

    void deleteByIdUserIdAndIdFriendId(Long userId, Long friendId);
}