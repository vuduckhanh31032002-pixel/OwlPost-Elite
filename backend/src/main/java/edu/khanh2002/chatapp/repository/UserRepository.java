package edu.khanh2002.chatapp.repository;

import edu.khanh2002.chatapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    @Query(value = "SELECT * FROM users u WHERE " +
           "u.id <> :excludeId AND " +
           "(LOWER(unaccent(u.fullname)) LIKE LOWER(CONCAT('%', unaccent(:keyword), '%')) OR " +
           "LOWER(unaccent(u.email)) LIKE LOWER(CONCAT('%', unaccent(:keyword), '%')))",
           nativeQuery = true)
    List<User> searchUsers(@Param("keyword") String keyword, @Param("excludeId") Long excludeId);
}