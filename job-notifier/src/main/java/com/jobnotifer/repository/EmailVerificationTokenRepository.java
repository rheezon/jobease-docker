package com.jobnotifer.repository;

import com.jobnotifer.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenAndUsedFalseAndExpiryDateAfter(String token, LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from EmailVerificationToken e where e.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
