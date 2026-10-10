package service

import (
	"context"
	"errors"
	"time"

	"github.com/diagdesk/device-gateway/internal/model"
	"github.com/diagdesk/device-gateway/internal/repository"
	"github.com/jackc/pgx/v5"
)

type MessageService struct {
	repo *repository.MessageRepo
}

func NewMessageService(repo *repository.MessageRepo) *MessageService {
	return &MessageService{repo: repo}
}

func (s *MessageService) ListMessages(ctx context.Context, tenantID, connectionID, from, to, status string) ([]*model.DeviceMessage, error) {
	return s.repo.FindAll(ctx, tenantID, connectionID, from, to, status)
}

func (s *MessageService) ListUnmatched(ctx context.Context, tenantID string) ([]*model.DeviceMessage, error) {
	return s.repo.FindUnmatched(ctx, tenantID)
}

func (s *MessageService) MatchResult(ctx context.Context, messageID, accessionID, userID, tenantID string) (*model.MatchResultResponse, error) {
	msg, err := s.repo.FindByID(ctx, messageID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if msg.TenantID != tenantID {
		return nil, ErrNotFound
	}
	if msg.Status == model.MessageMatched {
		return nil, errors.New("result is already matched")
	}

	if err := s.repo.MarkMatched(ctx, messageID, accessionID, userID); err != nil {
		return nil, err
	}

	return &model.MatchResultResponse{
		ResultID:  messageID,
		MatchedAt: time.Now().UTC(),
	}, nil
}
