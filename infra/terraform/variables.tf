### ── Upstash ──────────────────────────────────────────────────────────────────
variable "upstash_email" {
  description = "Upstash account email (from console.upstash.com → Account)"
  type        = string
  sensitive   = true
}

variable "upstash_api_key" {
  description = "Upstash Management API key (console.upstash.com → Account → API Keys)"
  type        = string
  sensitive   = true
}

variable "upstash_region" {
  description = "Upstash region for Redis. Free-tier regions: us-east-1, eu-west-1, ap-southeast-1"
  type        = string
  default     = "ap-southeast-1"
}

### ── DigitalOcean ─────────────────────────────────────────────────────────────
variable "do_token" {
  description = "DigitalOcean personal access token (cloud.digitalocean.com → API → Tokens)"
  type        = string
  sensitive   = true
}

### ── Environment ─────────────────────────────────────────────────────────────
variable "environment" {
  description = "Deployment environment: dev, staging, or prod"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}
