package config

import (
	"os"
	"strings"
)

type Config struct {
	Server       ServerConfig
	DB           DBConfig
	Redis        RedisConfig
	Kafka        KafkaConfig
	Auth         AuthConfig
	OrderService OrderServiceConfig
}

type ServerConfig struct {
	Port string
}

type DBConfig struct {
	DSN string
}

type RedisConfig struct {
	Addr     string
	Password string
}

type KafkaConfig struct {
	Brokers []string
}

type AuthConfig struct {
	JWKSetURI string
	Issuer    string
}

type OrderServiceConfig struct {
	BaseURL string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getenv("SERVER_PORT", "8084"),
		},
		DB: DBConfig{
			DSN: getenv("DB_DSN", "postgres://diagdesk:diagdesk@localhost:5432/device_db?search_path=devices&sslmode=disable"),
		},
		Redis: RedisConfig{
			Addr:     getenv("REDIS_ADDR", "localhost:6379"),
			Password: getenv("REDIS_PASSWORD", ""),
		},
		Kafka: KafkaConfig{
			Brokers: strings.Split(getenv("KAFKA_BROKERS", "localhost:9092"), ","),
		},
		Auth: AuthConfig{
			JWKSetURI: getenv("KEYCLOAK_JWK_URI", "http://localhost:8080/realms/diagdesk/protocol/openid-connect/certs"),
			Issuer:    getenv("KEYCLOAK_ISSUER", "http://localhost:8080/realms/diagdesk"),
		},
		OrderService: OrderServiceConfig{
			BaseURL: getenv("ORDER_SERVICE_URL", "http://localhost:8083"),
		},
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
