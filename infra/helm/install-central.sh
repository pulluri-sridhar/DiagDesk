#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DiagDesk central cloud deployment installer
#
# Deploys cloud-only services (mis-analytics, audit-consent, b2b-billing)
# to a Kubernetes cluster (GKE / EKS / AKS / k3s) connected to Supabase.
#
# Usage:
#   ./install-central.sh [IMAGE_TAG] [HOST] [TLS_EMAIL]
#
# Examples:
#   # Staging:
#   ./install-central.sh dev api-staging.diagdesk.in admin@diagdesk.in
#
#   # Production:
#   ./install-central.sh v1.2 api.diagdesk.in admin@diagdesk.in
#
# After install, seal credentials:
#   cd infra/helm && ./seal-central-secrets.sh diagdesk-central
#   helm upgrade diagdesk-central ./diagdesk-central -f values-central-production.yaml
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IMAGE_TAG="${1:-dev}"
HOST="${2:-api.diagdesk.in}"
TLS_EMAIL="${3:-}"
RELEASE="diagdesk-central"
NAMESPACE="diagdesk-central"
CHART_DIR="$(cd "$(dirname "$0")/diagdesk-central" && pwd)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ── 1. Verify cluster access ───────────────────────────────────────────────
kubectl cluster-info &>/dev/null || { echo "ERROR: kubectl cannot reach a cluster. Configure KUBECONFIG first."; exit 1; }
log "Cluster: $(kubectl config current-context)"

# ── 2. Install Helm (skip if already present) ─────────────────────────────
if ! command -v helm &>/dev/null; then
  log "Installing Helm..."
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# ── 3. Add Helm repos ──────────────────────────────────────────────────────
log "Adding Helm repos..."
helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
helm repo update

# ── 4. Install Bitnami Sealed Secrets controller ──────────────────────────
if ! kubectl get deployment sealed-secrets-controller -n kube-system &>/dev/null; then
  log "Installing Bitnami Sealed Secrets controller..."
  helm upgrade --install sealed-secrets sealed-secrets \
    --repo https://bitnami-labs.github.io/sealed-secrets \
    --namespace kube-system \
    --version "2.16.1" \
    --set fullnameOverride=sealed-secrets-controller \
    --wait --timeout 3m
  log "Sealed Secrets controller ready."
fi

# ── 5. Install cert-manager ────────────────────────────────────────────────
log "Installing cert-manager (required for TLS)..."
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version "v1.14.5" \
  --set crds.enabled=true \
  --wait --timeout 5m
log "cert-manager ready."

# ── 6. Build TLS args ─────────────────────────────────────────────────────
TLS_ARGS="--set ingress.tls.enabled=true --set ingress.tls.issuer=letsencrypt-prod"
if [ -n "$TLS_EMAIL" ]; then
  TLS_ARGS="${TLS_ARGS} --set ingress.tls.email=${TLS_EMAIL}"
else
  log "WARNING: No TLS email provided. Let's Encrypt ACME requires a valid email."
  log "         Pass it as the 3rd argument: ./install-central.sh ${IMAGE_TAG} ${HOST} admin@example.com"
fi

# ── 7. Deploy DiagDesk central chart ──────────────────────────────────────
log "Deploying DiagDesk central (tag=${IMAGE_TAG}, host=${HOST})..."
helm upgrade --install "$RELEASE" "$CHART_DIR" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --values "$CHART_DIR/values.yaml" \
  --set "image.tag=${IMAGE_TAG}" \
  --set "ingress.host=${HOST}" \
  ${TLS_ARGS} \
  --timeout 10m \
  --wait

# ── 8. Summary ────────────────────────────────────────────────────────────
log "────────────────────────────────────────"
log "DiagDesk central deployment complete!"
log "  Host  : https://${HOST}"
log ""
log "Services exposed at:"
log "  https://${HOST}/v1/analytics  → mis-analytics-service"
log "  https://${HOST}/v1/audit      → audit-consent-service"
log "  https://${HOST}/v1/b2b        → b2b-billing-service"
log ""
log "NEXT: Seal Supabase and Kafka credentials:"
log "  cd infra/helm && ./seal-central-secrets.sh ${NAMESPACE}"
log "  helm upgrade ${RELEASE} ./diagdesk-central -f values-central-production.yaml"
log ""
log "Set Supabase connection in values-central-production.yaml (or --set):"
log "  commonEnv.DB_HOST: <pooler>.pooler.supabase.com"
log "  commonEnv.DB_PORT: \"6543\""
log "  commonEnv.DB_NAME: postgres"
log "  sealedSecrets.dbUser: <sealed>"
log "  sealedSecrets.dbPassword: <sealed>"
log "────────────────────────────────────────"
