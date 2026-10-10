package model

import "time"

type MessageStatus string

const (
	MessageMatched   MessageStatus = "matched"
	MessageUnmatched MessageStatus = "unmatched"
	MessageError     MessageStatus = "error"
)

type DeviceMessage struct {
	MessageID          string        `json:"message_id"`
	ConnectionID       string        `json:"connection_id"`
	TenantID           string        `json:"tenant_id"`
	RawMessage         string        `json:"raw_message,omitempty"`
	Protocol           Protocol      `json:"protocol"`
	Status             MessageStatus `json:"status"`
	MatchedAccessionID *string       `json:"matched_accession_id,omitempty"`
	PatientNameInMsg   *string       `json:"patient_name_in_message,omitempty"`
	TestCode           *string       `json:"test_code,omitempty"`
	Value              *string       `json:"value,omitempty"`
	Unit               *string       `json:"unit,omitempty"`
	ReceivedAt         time.Time     `json:"received_at"`
	MatchedAt          *time.Time    `json:"matched_at,omitempty"`
	MatchedBy          *string       `json:"matched_by,omitempty"`
	AnalyzerID         string        `json:"analyzer_id,omitempty"`
}

type MatchResultRequest struct {
	AccessionID string `json:"accession_id" binding:"required"`
}

type MatchResultResponse struct {
	ResultID  string    `json:"result_id"`
	MatchedAt time.Time `json:"matched_at"`
}
