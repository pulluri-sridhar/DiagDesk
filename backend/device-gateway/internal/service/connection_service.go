package service

import (
	"context"
	"errors"
	"time"

	"github.com/diagdesk/device-gateway/internal/model"
	"github.com/diagdesk/device-gateway/internal/repository"
	"github.com/jackc/pgx/v5"
)

// ErrNotFound is returned when a requested resource does not exist.
var ErrNotFound = errors.New("resource not found")

type ConnectionService struct {
	repo      *repository.ConnectionRepo
	socketMgr *SocketManager
}

func NewConnectionService(repo *repository.ConnectionRepo, socketMgr *SocketManager) *ConnectionService {
	return &ConnectionService{repo: repo, socketMgr: socketMgr}
}

func (s *ConnectionService) Register(ctx context.Context, tenantID string, req *model.RegisterConnectionRequest) (*model.DeviceConnection, error) {
	dc := &model.DeviceConnection{
		TenantID:     tenantID,
		BranchID:     req.BranchID,
		DepartmentID: req.DepartmentID,
		AnalyzerID:   req.AnalyzerID,
		DisplayName:  req.DisplayName,
		Protocol:     req.Protocol,
		Host:         req.Host,
		Port:         req.Port,
		Model:        req.Model,
		SerialNumber: req.SerialNumber,
	}

	if err := s.repo.Create(ctx, dc); err != nil {
		return nil, err
	}

	// Dial asynchronously — don't block the HTTP response
	go func() {
		_ = s.socketMgr.Connect(context.Background(), dc)
	}()

	return dc, nil
}

func (s *ConnectionService) List(ctx context.Context, tenantID string) ([]*model.DeviceConnection, error) {
	list, err := s.repo.FindAll(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	// Overlay live socket status (DB status may lag behind reality)
	for _, dc := range list {
		dc.Status = s.socketMgr.GetLiveStatus(dc.ConnectionID)
	}
	return list, nil
}

func (s *ConnectionService) GetByID(ctx context.Context, id, tenantID string) (*model.DeviceConnection, error) {
	dc, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	dc.Status = s.socketMgr.GetLiveStatus(id)
	return dc, nil
}

func (s *ConnectionService) Delete(ctx context.Context, id, tenantID string) error {
	s.socketMgr.Disconnect(id)
	return s.repo.SoftDelete(ctx, id, tenantID)
}

func (s *ConnectionService) Reconnect(ctx context.Context, id, tenantID string) (*model.DeviceConnection, error) {
	dc, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	now := time.Now().UTC()
	if err := s.socketMgr.Reconnect(ctx, dc); err != nil {
		dc.Status = model.StatusDisconnected
	} else {
		dc.Status = model.StatusConnected
		dc.UpdatedAt = &now
	}
	return dc, nil
}

func (s *ConnectionService) GetStatus(ctx context.Context, id, tenantID string) (*model.ConnectionStatusResponse, error) {
	dc, err := s.repo.FindByID(ctx, id, tenantID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	received, matched, unmatched, err := s.repo.DailyStats(ctx, id)
	if err != nil {
		return nil, err
	}

	return &model.ConnectionStatusResponse{
		ConnectionID:          id,
		Status:                s.socketMgr.GetLiveStatus(id),
		LastHeartbeatAt:       dc.LastSeenAt,
		MessagesReceivedToday: received,
		ResultsMatchedToday:   matched,
		ResultsUnmatchedToday: unmatched,
	}, nil
}
