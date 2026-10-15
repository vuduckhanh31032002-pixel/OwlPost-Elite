package edu.khanh2002.chatapp.repository;

import edu.khanh2002.chatapp.entity.GroupInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupInviteRepository
        extends JpaRepository<GroupInvite, Long> {

    List<GroupInvite> findByReceiver_IdAndStatus(Long receiverId, String status);
}