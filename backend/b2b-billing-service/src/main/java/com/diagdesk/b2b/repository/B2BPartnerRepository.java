package com.diagdesk.b2b.repository;

import com.diagdesk.b2b.entity.B2BPartner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface B2BPartnerRepository extends JpaRepository<B2BPartner, String> {

    Page<B2BPartner> findByTenantId(String tenantId, Pageable pageable);

    Page<B2BPartner> findByTenantIdAndNameContainingIgnoreCase(
            String tenantId, String name, Pageable pageable);

    long countByTenantId(String tenantId);

    List<B2BPartner> findByTenantIdOrderByNameAsc(String tenantId);
}
