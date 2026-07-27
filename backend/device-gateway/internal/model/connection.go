package model

import "time"

type Protocol string

const (
	ProtocolHL7v2    Protocol = "HL7_v2"
	ProtocolASTM1394 Protocol = "ASTM_1394"
)

type ConnectionStatus string

const (
	StatusConnected    ConnectionStatus = "connected"
	StatusDisconnected ConnectionStatus = "disconnected"
	StatusError        ConnectionStatus = "error"
)

type DeviceConnection struct {
	ConnectionID string           `json:"connection_id"`
	TenantID     string           `json:"tenant_id"`
	BranchID     string           `json:"branch_id"`
	DepartmentID string           `json:"department_id,omitempty"`
	AnalyzerID   string           `json:"analyzer_id"`
	DisplayName  string           `json:"display_name"`
	Protocol     Protocol         `json:"protocol"`
	Host         string           `json:"host"`
	Port         int              `json:"port"`
	Model        string           `json:"model,omitempty"`
	SerialNumber string           `json:"serial_number,omitempty"`
	Status       ConnectionStatus `json:"status"`
	LastSeenAt   *time.Time       `json:"last_seen_at,omitempty"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    *time.Time       `json:"updated_at,omitempty"`
}

type RegisterConnectionRequest struct {
	AnalyzerID   string   `json:"analyzer_id"   binding:"required"`
	DisplayName  string   `json:"display_name"  binding:"required"`
	Protocol     Protocol `json:"protocol"      binding:"required,oneof=HL7_v2 ASTM_1394"`
	Host         string   `json:"host"          binding:"required"`
	Port         int      `json:"port"          binding:"required,min=1,max=65535"`
	Model        string   `json:"model"`
	SerialNumber string   `json:"serial_number"`
	DepartmentID string   `json:"department_id"`
	BranchID     string   `json:"branch_id"     binding:"required"`
}

type ConnectionStatusResponse struct {
	ConnectionID          string           `json:"connection_id"`
	Status                ConnectionStatus `json:"status"`
	LastHeartbeatAt       *time.Time       `json:"last_heartbeat_at,omitempty"`
	MessagesReceivedToday int64            `json:"messages_received_today"`
	ResultsMatchedToday   int64            `json:"results_matched_today"`
	ResultsUnmatchedToday int64            `json:"results_unmatched_today"`
}
