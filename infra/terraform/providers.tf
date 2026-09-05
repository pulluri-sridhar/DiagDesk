terraform {
  required_version = ">= 1.5"

  required_providers {
    # Upstash — managed serverless Redis (token cache, catalog cache, rate limiting)
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
    # DigitalOcean — DOKS cluster (Bangalore / BLR1)
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
  }

  # Uncomment to store state in Terraform Cloud (recommended for teams)
  # backend "remote" {
  #   organization = "diagdesk"
  #   workspaces { name = "diagdesk-prod" }
  # }
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

provider "digitalocean" {
  token = var.do_token
}

# Kafka is self-hosted on Kubernetes via the Bitnami Helm chart (same image as
# docker-compose). Topics and ACLs are managed through Helm values or Strimzi
# KafkaTopic CRDs — not through Terraform.
