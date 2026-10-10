#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DiagDesk branch deployment installer for k3s
# Run this script on the branch server (Ubuntu 22.04 LTS recommended).
#
# Usage:
#   ./install-branch.sh [IMAGE_TAG] [BRANCH_HOST] [KEYCLOAK_PUB_KEY_FILE] [TLS_ISSUER] [TLS_EMAIL]
#
# Examples:
#   # Local/offline (self-signed cert):
#   ./install-branch.sh dev diagdesk.local /path/to/keycloak.pub selfsigned
#
#   # Internet branch with valid DNS (Let's Encrypt):
#   ./install-branch.sh v1.2 branch1.lab.diagdesk.in /path/to/keycloak.pub letsencrypt-prod admin@diagdesk.in
#
# TLS_ISSUER options:
#   ""                → TLS disabled (plain HTTP, default)
#   "selfsigned"      → Self-signed certificate (works offline, browser warning expected)
#   "letsencrypt-prod"   → Let's Encrypt production (requires public DNS + port 80)
#   "letsencrypt-staging" → Let's Encrypt staging (untrusted cert, for testing only)
#
# The Keycloak RSA public key enables offline JWT validation on the branch.
# Export from: Keycloak Admin → Realm Settings → Keys → RS256 → Public key.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IMAGE_TAG="${1:-dev}"
BRANCH_HOST="${2:-diagdesk.local}"
KEYCLOAK_PUB_KEY_FILE="${3:-}"
TLS_ISSUER="${4:-}"
TLS_EMAIL="${5:-}"
RELEASE="diagdesk-branch"
NAMESPACE="diagdesk-branch"
CHART_DIR="$(cd "$(dirname "$0")/diagdesk-branch" && pwd)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ── 1. Install k3s (skip if already running) ──────────────────────────────────
if ! command -v k3s &>/dev/null; then
  log "Installing k3s..."
  curl -sfL https://get.k3s.io | sh -s - \
    --write-kubeconfig-mode 644
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  log "Waiting for k3s to be ready..."
  sleep 15
  k3s kubectl wait --for=condition=ready node --all --timeout=120s
fi

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

# ── 2. Install Helm (skip if already present) ─────────────────────────────────
if ! command -v helm &>/dev/null; then
  log "Installing Helm..."
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# ── 3. Add Helm repos ─────────────────────────────────────────────────────────
log "Adding Helm repos..."
helm repo add bitnami  https://charts.bitnami.com/bitnami  2>/dev/null || true
helm repo add jetstack https://charts.jetstack.io           2>/dev/null || true
helm repo update

# ── 4. Install Bitnami Sealed Secrets controller ─────────────────────────────
# Always installed — provides encrypted secrets that are safe to commit to git.
# After deployment, run ./seal-secrets.sh to seal branch-specific credentials.
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

# ── 5. Install cert-manager (when TLS is requested) ──────────────────────────
if [ -n "$TLS_ISSUER" ]; then
  log "Installing cert-manager (required for TLS)..."
  helm upgrade --install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --create-namespace \
    --version "v1.14.5" \
    --set crds.enabled=true \
    --wait --timeout 5m
  log "cert-manager ready."
fi

# ── 6. Update DiagDesk chart dependencies ─────────────────────────────────────
log "Updating chart dependencies..."
helm dependency update "$CHART_DIR"

# ── 7. Build Keycloak public key arg ─────────────────────────────────────────
KEYCLOAK_KEY_ARG=""
if [ -n "$KEYCLOAK_PUB_KEY_FILE" ] && [ -f "$KEYCLOAK_PUB_KEY_FILE" ]; then
  KEY_CONTENT=$(cat "$KEYCLOAK_PUB_KEY_FILE")
  KEYCLOAK_KEY_ARG="--set-string keycloakPublicKey=${KEY_CONTENT}"
  log "Keycloak public key: loaded from $KEYCLOAK_PUB_KEY_FILE"
else
  log "WARNING: No Keycloak public key provided. Branch JWT auth will use placeholder."
  log "         Supply with: helm upgrade diagdesk-branch --set keycloakPublicKey=..."
fi

# ── 8. Build TLS args ─────────────────────────────────────────────────────────
TLS_ARGS=""
if [ -n "$TLS_ISSUER" ]; then
  TLS_ARGS="--set ingress.tls.enabled=true --set ingress.tls.issuer=${TLS_ISSUER}"
  if [ -n "$TLS_EMAIL" ]; then
    TLS_ARGS="${TLS_ARGS} --set ingress.tls.email=${TLS_EMAIL}"
  fi
  log "TLS: enabled (issuer=${TLS_ISSUER})"
else
  log "TLS: disabled (plain HTTP)"
fi

# ── 9. Install / upgrade DiagDesk ─────────────────────────────────────────────
log "Deploying DiagDesk branch (tag=${IMAGE_TAG}, host=${BRANCH_HOST})..."
helm upgrade --install "$RELEASE" "$CHART_DIR" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --values "$CHART_DIR/values.yaml" \
  --values "$CHART_DIR/values-branch.yaml" \
  --set "image.tag=${IMAGE_TAG}" \
  --set "ingress.host=${BRANCH_HOST}" \
  ${KEYCLOAK_KEY_ARG} \
  ${TLS_ARGS} \
  --timeout 10m \
  --wait

# ── 10. Summary ───────────────────────────────────────────────────────────────
NODE_IP=$(k3s kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "<node-ip>")
SCHEME="http"
[ -n "$TLS_ISSUER" ] && SCHEME="https"

log "────────────────────────────────────────"
log "DiagDesk branch deployment complete!"
log "  Node IP  : $NODE_IP"
log "  Host     : $BRANCH_HOST"
log "  TLS      : ${TLS_ISSUER:-disabled}"
log ""
log "Add to /etc/hosts on each workstation:"
log "  $NODE_IP  $BRANCH_HOST"
log ""
log "Services reachable at: ${SCHEME}://${BRANCH_HOST}"
log ""
log "NEXT: Seal branch credentials for git-safe storage:"
log "  cd infra/helm && ./seal-secrets.sh ${NAMESPACE}"
log "  helm upgrade diagdesk-branch ./diagdesk-branch -f values.yaml -f values-production.yaml"
if [ "$TLS_ISSUER" = "selfsigned" ]; then
  log ""
  log "NOTE: Self-signed cert — browsers will show a security warning."
  log "      Accept the exception once, or install the CA cert from:"
  log "      kubectl get secret diagdesk-tls-cert -n $NAMESPACE -o jsonpath='{.data.tls\\.crt}' | base64 -d > branch-ca.crt"
fi
log "────────────────────────────────────────"
