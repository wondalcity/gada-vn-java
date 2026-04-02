# Placeholder secrets — values must be set manually after `terraform apply`
# aws secretsmanager put-secret-value --secret-id /gada/staging/<name> --secret-string '...'

locals {
  secret_names = [
    "database-url",         # jdbc:postgresql://host:5432/gada_staging
    "database-user",        # DB username
    "database-password",    # DB password
    "redis-url",            # redis://:password@host:6379
    "firebase-credentials", # Firebase service account JSON (base64-encoded)
    "firebase-project-id",  # e.g. gada-vn
    "firebase-web-api-key", # Firebase web API key
    "jwt-secret",           # Random 64-char hex
    "admin-service-key",    # Shared secret between api and admin (64+ chars)
    "anthropic-api-key",    # sk-ant-...
  ]
}

resource "aws_secretsmanager_secret" "app" {
  for_each = toset(local.secret_names)

  name                    = "/gada/staging/${each.key}"
  description             = "GADA staging: ${each.key}"
  recovery_window_in_days = 0 # Allow immediate deletion when tearing down staging

  tags = local.common_tags
}
