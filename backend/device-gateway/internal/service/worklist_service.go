package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type WorklistService struct {
	socketMgr   *SocketManager
	orderSvcURL string
	httpClient  *http.Client
}

func NewWorklistService(socketMgr *SocketManager, orderSvcURL string) *WorklistService {
	return &WorklistService{
		socketMgr:   socketMgr,
		orderSvcURL: orderSvcURL,
		httpClient:  &http.Client{Timeout: 5 * time.Second},
	}
}

type PushWorklistRequest struct {
	AccessionIDs []string `json:"accession_ids"`
}

type PushWorklistResponse struct {
	SentCount int      `json:"sent_count"`
	FailedIDs []string `json:"failed_ids"`
}

func (s *WorklistService) Push(ctx context.Context, connectionID, tenantID string, req *PushWorklistRequest) (*PushWorklistResponse, error) {
	entries, err := s.fetchWorklist(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("fetch worklist from order-service: %w", err)
	}

	// If caller specified accession IDs, filter to only those
	if len(req.AccessionIDs) > 0 {
		filter := make(map[string]bool, len(req.AccessionIDs))
		for _, id := range req.AccessionIDs {
			filter[id] = true
		}
		filtered := entries[:0]
		for _, e := range entries {
			if filter[e.AccessionNumber] {
				filtered = append(filtered, e)
			}
		}
		entries = filtered
	}

	sent, failed := s.socketMgr.SendWorklist(connectionID, entries)

	failedIDs := failed
	if failedIDs == nil {
		failedIDs = []string{}
	}
	return &PushWorklistResponse{
		SentCount: sent,
		FailedIDs: failedIDs,
	}, nil
}

// fetchWorklist calls order-service to get all pending (collected) samples for the tenant.
func (s *WorklistService) fetchWorklist(ctx context.Context, tenantID string) ([]WorklistEntry, error) {
	url := s.orderSvcURL + "/v1/worklist"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Data []struct {
			AccessionNumber string `json:"accession_number"`
			TestCode        string `json:"test_code"`
			TestName        string `json:"test_name"`
			SpecimenType    string `json:"specimen_type"`
			PatientID       string `json:"patient_id"`
			PatientName     string `json:"patient_name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	entries := make([]WorklistEntry, 0, len(result.Data))
	for _, item := range result.Data {
		entries = append(entries, WorklistEntry{
			AccessionNumber: item.AccessionNumber,
			TestCode:        item.TestCode,
			TestName:        item.TestName,
			SpecimenType:    item.SpecimenType,
			PatientID:       item.PatientID,
			PatientName:     item.PatientName,
		})
	}
	return entries, nil
}
