package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/diagdesk/device-gateway/internal/config"
	"github.com/diagdesk/device-gateway/internal/database"
	"github.com/diagdesk/device-gateway/internal/handler"
	"github.com/diagdesk/device-gateway/internal/repository"
	"github.com/diagdesk/device-gateway/internal/router"
	"github.com/diagdesk/device-gateway/internal/service"
	"github.com/redis/go-redis/v9"
	kafka "github.com/segmentio/kafka-go"
)

func main() {
	cfg := config.Load()

	pool, err := database.NewPool(context.Background(), cfg.DB)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
	})
	defer rdb.Close()

	kw := &kafka.Writer{
		Addr:                   kafka.TCP(cfg.Kafka.Brokers...),
		Balancer:               &kafka.LeastBytes{},
		RequiredAcks:           kafka.RequireAll,
		AllowAutoTopicCreation: true,
	}
	defer kw.Close()

	connRepo := repository.NewConnectionRepo(pool)
	msgRepo := repository.NewMessageRepo(pool)

	socketMgr := service.NewSocketManager(connRepo, msgRepo, kw, cfg.OrderService.BaseURL)
	socketMgr.LoadAndDial(context.Background())

	connSvc := service.NewConnectionService(connRepo, socketMgr)
	worklistSvc := service.NewWorklistService(socketMgr, cfg.OrderService.BaseURL)
	msgSvc := service.NewMessageService(msgRepo)

	connHandler := handler.NewConnectionHandler(connSvc)
	worklistHandler := handler.NewWorklistHandler(worklistSvc)
	msgHandler := handler.NewMessageHandler(msgSvc)

	engine := router.New(cfg, connHandler, worklistHandler, msgHandler)

	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      engine,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("device-gateway listening on :%s", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("device-gateway shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	socketMgr.CloseAll()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("server shutdown: %v", err)
	}
	log.Println("device-gateway stopped")

	// suppress unused import warning for redis (used for future idempotency)
	_ = rdb
}
