package edu.khanh2002.chatapp.repository;

import edu.khanh2002.chatapp.entity.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    boolean existsBySender_IdAndReceiver_IdAndStatus(Long senderId, Long receiverId, String status);

    List<FriendRequest> findByReceiver_IdAndStatus(Long receiverId, String status);

    List<FriendRequest> findBySender_IdAndStatus(Long senderId, String status);

    boolean existsBySender_IdAndReceiver_Id(Long senderId, Long receiverId);

    List<FriendRequest> findBySender_IdAndReceiver_Id(Long senderId, Long receiverId);

    List<FriendRequest> findBySender_IdAndReceiver_IdOrSender_IdAndReceiver_Id(
            Long senderId1,
            Long receiverId1,
            Long senderId2,
            Long receiverId2
    );
}
