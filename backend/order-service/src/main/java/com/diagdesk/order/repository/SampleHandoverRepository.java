package com.diagdesk.order.repository;

import com.diagdesk.order.entity.SampleHandover;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SampleHandoverRepository extends JpaRepository<SampleHandover, String> {
    Optional<SampleHandover> findByAccessionId(String accessionId);
}
