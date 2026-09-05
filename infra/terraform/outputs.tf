### ── Redis (Upstash) ─────────────────────────────────────────────────────────

output "redis_endpoint" {
  description = "Redis hostname (use with port 6379, TLS enabled)"
  value       = upstash_redis_database.main.endpoint
}

output "redis_password" {
  description = "Redis password (set as REDIS_PASSWORD env var in each Spring Boot service)"
  value       = upstash_redis_database.main.password
  sensitive   = true
}

output "redis_url" {
  description = "Full Redis URL — set as SPRING_DATA_REDIS_URL or REDIS_ADDR"
  value       = "rediss://:${upstash_redis_database.main.password}@${upstash_redis_database.main.endpoint}:6379"
  sensitive   = true
}

### ── Summary ─────────────────────────────────────────────────────────────────

output "env_snippet" {
  description = "Paste this into application-cloud.yml (replace <DB_URL> with your Supabase URL)"
  sensitive   = true
  value       = <<-EOT
    # ── Redis (Upstash) ─────────────────────────────────────────────
    spring.data.redis.host=${upstash_redis_database.main.endpoint}
    spring.data.redis.port=6379
    spring.data.redis.password=${upstash_redis_database.main.password}
    spring.data.redis.ssl.enabled=true

    # ── Kafka (self-hosted on K8s) ──────────────────────────────────
    # No credentials needed — PLAINTEXT within the cluster.
    # External access (from local dev pointing at staging):
    #   use a NodePort or kubectl port-forward to diagdesk-kafka:9092
    spring.kafka.bootstrap-servers=diagdesk-kafka.kafka.svc.cluster.local:9092
  EOT
}
