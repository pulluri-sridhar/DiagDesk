package com.diagdesk.b2b.repository;

import com.diagdesk.b2b.entity.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FollowUpRepository extends JpaRepository<FollowUp, String> {

    List<FollowUp> findByPartnerId(String partnerId);

    List<FollowUp> findByPartnerIdOrderByCreatedAtDesc(String partnerId);
}
