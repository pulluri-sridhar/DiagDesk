package com.diagdesk.order.repository;

import com.diagdesk.order.entity.SampleRejection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SampleRejectionRepository extends JpaRepository<SampleRejection, String> {
    List<SampleRejection> findAllByAccessionIdOrderByRejectedAtDesc(String accessionId);
}
