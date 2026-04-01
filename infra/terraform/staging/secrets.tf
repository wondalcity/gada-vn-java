# Placeholder secrets — values must be set manually after `terraform apply`
# aws secretsmanager put-secret-value --secret-id /gada/staging/<name> --secret-string '...'

locals {
  secret_names = [
    "database-url",         # postgres://user:pass@host:5432/db
    "firebase-credentials", # Firebase service account JSON (base64)
    "jwt-secret",           # Random 64-char hex
    "s3-region",            # ap-southeast-1
    "redis-url",            # redis://host:6379
  ]
}

resource "aws_secretsmanager_secret" "app" {
  for_each = toset(local.secret_names)

  name                    = "/gada/staging/${each.key}"
  description             = "GADA staging: ${each.key}"
  recovery_window_in_days = 0 # Allow immediate deletion when tearing down staging

  tags = local.common_tags
}
