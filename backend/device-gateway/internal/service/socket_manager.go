package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/diagdesk/device-gateway/internal/model"
	"github.com/diagdesk/device-gateway/internal/repository"
	"github.com/diagdesk/device-gateway/internal/service/protocol"
	kafka "github.com/segmentio/kafka-go"
)

const (
	dialTimeout = 10 * time.Second
	readTimeout = 5 * time.Minute
	mllpSob     = byte(0x0b) // MLLP start-of-block
	mllpEob     = byte(0x1c) // MLLP end-of-block
)

// WorklistEntry is the data needed to format one worklist item for an analyzer.
type WorklistEntry struct {
	AccessionNumber string
	TestCode        string
	TestName        string
	SpecimenType    string
	PatientID       string
	PatientName     string
}

type managedConn struct {
	conn     net.Conn
	cancel   context.CancelFunc
	protocol model.Protocol
	info     *model.DeviceConnection
}

// SocketManager maintains one goroutine-per-analyzer TCP connection pool.
// Each registered analyzer has a goroutine reading incoming HL7/ASTM messages.
type SocketManager struct {
	mu          sync.RWMutex
	connections map[string]*managedConn // keyed by connection_id

	connRepo    *repository.ConnectionRepo
	msgRepo     *repository.MessageRepo
	kafkaWriter *kafka.Writer
	orderSvcURL string
	httpClient  *http.Client
}

func NewSocketManager(
	connRepo *repository.ConnectionRepo,
	msgRepo *repository.MessageRepo,
	kw *kafka.Writer,
	orderSvcURL string,
) *SocketManager {
	return &SocketManager{
		connections: make(map[string]*managedConn),
		connRepo:    connRepo,
		msgRepo:     msgRepo,
		kafkaWriter: kw,
		orderSvcURL: orderSvcURL,
		httpClient:  &http.Client{Timeout: 3 * time.Second},
	}
}

// LoadAndDial loads all connections from DB on startup and attempts to dial each.
func (sm *SocketManager) LoadAndDial(ctx context.Context) {
	connections, err := sm.connRepo.FindAllActive(ctx)
	if err != nil {
		log.Printf("socket_manager: load connections: %v", err)
		return
	}
	for _, dc := range connections {
		if err := sm.Connect(ctx, dc); err != nil {
			log.Printf("socket_manager: dial %s (%s:%d): %v", dc.AnalyzerID, dc.Host, dc.Port, err)
		}
	}
}

// Connect dials a TCP connection to the analyzer and starts a read loop goroutine.
func (sm *SocketManager) Connect(ctx context.Context, dc *model.DeviceConnection) error {
	addr := fmt.Sprintf("%s:%d", dc.Host, dc.Port)
	conn, err := net.DialTimeout("tcp", addr, dialTimeout)
	if err != nil {
		_ = sm.connRepo.UpdateStatus(ctx, dc.ConnectionID, model.StatusDisconnected, nil)
		return err
	}

	connCtx, cancel := context.WithCancel(context.Background())
	mc := &managedConn{
		conn:     conn,
		cancel:   cancel,
		protocol: dc.Protocol,
		info:     dc,
	}

	sm.mu.Lock()
	sm.connections[dc.ConnectionID] = mc
	sm.mu.Unlock()

	now := time.Now().UTC()
	_ = sm.connRepo.UpdateStatus(ctx, dc.ConnectionID, model.StatusConnected, &now)

	go sm.readLoop(connCtx, dc.ConnectionID, mc)
	log.Printf("socket_manager: connected to %s at %s", dc.AnalyzerID, addr)
	return nil
}

// Disconnect closes the TCP connection and cancels the read loop.
func (sm *SocketManager) Disconnect(id string) {
	sm.mu.Lock()
	mc, ok := sm.connections[id]
	if ok {
		delete(sm.connections, id)
	}
	sm.mu.Unlock()

	if ok {
		mc.cancel()
		_ = mc.conn.Close()
	}
	_ = sm.connRepo.UpdateStatus(context.Background(), id, model.StatusDisconnected, nil)
}

// Reconnect closes and re-dials.
func (sm *SocketManager) Reconnect(ctx context.Context, dc *model.DeviceConnection) error {
	sm.Disconnect(dc.ConnectionID)
	return sm.Connect(ctx, dc)
}

// GetLiveStatus reports whether the socket is currently open.
func (sm *SocketManager) GetLiveStatus(id string) model.ConnectionStatus {
	sm.mu.RLock()
	_, ok := sm.connections[id]
	sm.mu.RUnlock()
	if ok {
		return model.StatusConnected
	}
	return model.StatusDisconnected
}

// SendWorklist writes HL7/ASTM worklist messages over the open socket.
// Returns the number of items successfully sent and the IDs of any failures.
func (sm *SocketManager) SendWorklist(connectionID string, entries []WorklistEntry) (int, []string) {
	sm.mu.RLock()
	mc, ok := sm.connections[connectionID]
	sm.mu.RUnlock()

	if !ok {
		return 0, nil
	}

	var failed []string
	sent := 0

	for _, e := range entries {
		var msg string
		switch mc.protocol {
		case model.ProtocolHL7v2:
			// FormatHL7Worklist already wraps in MLLP envelope
			msg = protocol.FormatHL7Worklist(e.AccessionNumber, e.TestCode, e.TestName, e.SpecimenType, e.PatientID)
		case model.ProtocolASTM1394:
			msg = protocol.FormatASTMWorklist(e.AccessionNumber, e.TestCode, e.PatientName)
		}
		if _, err := fmt.Fprint(mc.conn, msg); err != nil {
			failed = append(failed, e.AccessionNumber)
			continue
		}
		sent++
	}
	return sent, failed
}

// CloseAll shuts down all managed connections (called at process shutdown).
func (sm *SocketManager) CloseAll() {
	sm.mu.Lock()
	ids := make([]string, 0, len(sm.connections))
	for id := range sm.connections {
		ids = append(ids, id)
	}
	sm.mu.Unlock()

	for _, id := range ids {
		sm.Disconnect(id)
	}
}

// readLoop runs per-connection in a goroutine, reading HL7/ASTM messages from the socket.
func (sm *SocketManager) readLoop(ctx context.Context, id string, mc *managedConn) {
	defer func() {
		sm.mu.Lock()
		delete(sm.connections, id)
		sm.mu.Unlock()
		_ = sm.connRepo.UpdateStatus(context.Background(), id, model.StatusDisconnected, nil)
		log.Printf("socket_manager: read loop ended for %s", id)
	}()

	reader := bufio.NewReader(mc.conn)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		_ = mc.conn.SetReadDeadline(time.Now().Add(readTimeout))

		var (
			raw []byte
			err error
		)
		switch mc.protocol {
		case model.ProtocolHL7v2:
			raw, err = readMLLP(reader)
		case model.ProtocolASTM1394:
			raw, err = readASTM(reader)
		}

		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue
			}
			if err != io.EOF {
				log.Printf("socket_manager: read error on %s: %v", id, err)
			}
			return
		}

		now := time.Now().UTC()
		_ = sm.connRepo.UpdateStatus(context.Background(), id, model.StatusConnected, &now)

		go sm.processMessage(context.Background(), id, mc, string(raw))
	}
}

// readMLLP reads one HL7 MLLP-framed message (0x0B ... 0x1C 0x0D).
func readMLLP(r *bufio.Reader) ([]byte, error) {
	// Skip bytes until start-of-block
	for {
		b, err := r.ReadByte()
		if err != nil {
			return nil, err
		}
		if b == mllpSob {
			break
		}
	}
	msg, err := r.ReadBytes(mllpEob)
	if err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(msg, []byte{mllpEob}), nil
}

// readASTM reads one ASTM E1394 message (terminated by L record line).
func readASTM(r *bufio.Reader) ([]byte, error) {
	var buf bytes.Buffer
	for {
		line, err := r.ReadBytes('\r')
		if err != nil {
			return nil, err
		}
		buf.Write(line)
		if len(line) > 0 && line[0] == 'L' {
			break
		}
	}
	return buf.Bytes(), nil
}

// processMessage parses a raw HL7/ASTM message, tries to auto-match, and stores it.
func (sm *SocketManager) processMessage(ctx context.Context, connectionID string, mc *managedConn, raw string) {
	var (
		parsed   *protocol.ParsedResult
		parseErr error
	)
	switch mc.protocol {
	case model.ProtocolHL7v2:
		parsed, parseErr = protocol.ParseHL7(raw)
	case model.ProtocolASTM1394:
		parsed, parseErr = protocol.ParseASTM(raw)
	}

	msg := &model.DeviceMessage{
		ConnectionID: connectionID,
		TenantID:     mc.info.TenantID,
		RawMessage:   raw,
		Protocol:     mc.protocol,
		Status:       model.MessageError,
	}

	if parseErr != nil || parsed == nil {
		_ = sm.msgRepo.Save(ctx, msg)
		return
	}

	if parsed.PatientName != "" {
		msg.PatientNameInMsg = &parsed.PatientName
	}
	if parsed.TestCode != "" {
		msg.TestCode = &parsed.TestCode
	}
	if parsed.Value != "" {
		msg.Value = &parsed.Value
	}
	if parsed.Unit != "" {
		msg.Unit = &parsed.Unit
	}

	// Auto-match: verify the accession exists in order-service
	if parsed.AccessionID != "" && sm.verifyAccession(ctx, mc.info.TenantID, parsed.AccessionID) {
		msg.Status = model.MessageMatched
		msg.MatchedAccessionID = &parsed.AccessionID
		_ = sm.msgRepo.Save(ctx, msg)
		sm.publishResultRaw(ctx, mc.info, parsed, msg.MessageID)
		return
	}

	msg.Status = model.MessageUnmatched
	_ = sm.msgRepo.Save(ctx, msg)
}

// verifyAccession calls order-service to confirm the accession exists.
// Internal service-to-service call on trusted network — no auth token required.
func (sm *SocketManager) verifyAccession(ctx context.Context, tenantID, accessionID string) bool {
	url := sm.orderSvcURL + "/v1/samples/" + accessionID
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false
	}
	req.Header.Set("X-Tenant-ID", tenantID)

	resp, err := sm.httpClient.Do(req)
	if err != nil {
		return false
	}
	_ = resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// publishResultRaw emits a Kafka event so Result service can auto-create the result entry.
func (sm *SocketManager) publishResultRaw(ctx context.Context, dc *model.DeviceConnection, parsed *protocol.ParsedResult, messageID string) {
	payload := map[string]any{
		"message_id":   messageID,
		"accession_id": parsed.AccessionID,
		"test_code":    parsed.TestCode,
		"value":        parsed.Value,
		"unit":         parsed.Unit,
		"source":       "analyzer",
		"analyzer_id":  dc.AnalyzerID,
		"tenant_id":    dc.TenantID,
		"branch_id":    dc.BranchID,
	}
	data, _ := json.Marshal(payload)
	if err := sm.kafkaWriter.WriteMessages(ctx, kafka.Message{
		Topic: "result.raw",
		Key:   []byte(parsed.AccessionID),
		Value: data,
	}); err != nil {
		log.Printf("socket_manager: kafka publish error for %s: %v", parsed.AccessionID, err)
	}
}
