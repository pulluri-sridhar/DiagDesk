locals {
  name_prefix = "diagdesk-${var.environment}"
}

### ── Redis (Upstash) ─────────────────────────────────────────────────────────
# Free tier: 256 MB, up to 10,000 commands/day, no eviction.
# DiagDesk uses Redis for: token caching, catalog cache, rate limiting.

resource "upstash_redis_database" "main" {
  database_name = "${local.name_prefix}-redis"
  region        = var.upstash_region
  tls           = true
}

### ── Kafka — self-hosted on Kubernetes ──────────────────────────────────────
# Deployed via the Bitnami Kafka Helm chart on DOKS (Bangalore / BLR1).
# This keeps all PHI-carrying events India-resident at zero licensing cost.
#
# Helm install (run once per cluster):
#   helm repo add bitnami https://charts.bitnami.com/bitnami
#   helm upgrade --install diagdesk-kafka bitnami/kafka \
#     --namespace kafka --create-namespace \
#     --set kraft.enabled=true \
#     --set replicaCount=3 \
#     --set defaultReplicationFactor=3 \
#     --set numPartitions=3 \
#     --set autoCreateTopicsEnable=false \
#     --set persistence.size=20Gi
#
# Topics to create (mirror docker-compose KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=false):
#   audit.events        (cleanup.policy=compact, retention.ms=604800000)
#   result.raw          (cleanup.policy=delete,  retention.ms=604800000)
#   result.validated    (cleanup.policy=delete,  retention.ms=604800000)
#   order.created       (cleanup.policy=delete,  retention.ms=604800000)
#   order.status        (cleanup.policy=delete,  retention.ms=604800000)
#   patient.registered  (cleanup.policy=delete,  retention.ms=604800000)
#
# Spring Boot bootstrap-servers (in application-cloud.yml):
#   KAFKA_BOOTSTRAP: diagdesk-kafka.kafka.svc.cluster.local:9092

### ── Kubernetes Cluster (DOKS — DigitalOcean Bangalore) ─────────────────────

resource "digitalocean_kubernetes_cluster" "main" {
  name    = "${local.name_prefix}-k8s"
  region  = "blr1"   # Bangalore — India data residency (DPDP + CERT-In)
  version = "latest" # pin to a specific slug in prod: `doctl kubernetes options versions`

  node_pool {
    name       = "worker-pool"
    size       = "s-2vcpu-4gb" # 4 GB RAM minimum — Spring Boot services are JVM-based
    node_count = 3
    auto_scale = true
    min_nodes  = 3
    max_nodes  = 6
  }
}

output "kube_config" {
  description = "Run: terraform output -raw kube_config > ~/.kube/diagdesk.yaml"
  value       = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  sensitive   = true
}