# Staging Bootstrap Order

Step-by-step sequence to bring up the GADA VN staging environment from zero.

---

## Phase 1 — Prerequisites (one-time)

### 1.1 AWS CLI + Terraform installed
```bash
brew install awscli
brew install hashicorp/tap/terraform
aws configure  # Enter Access Key ID, Secret, region: ap-southeast-1, output: json
aws sts get-caller-identity  # Verify credentials
```

### 1.2 Ensure IAM user has sufficient permissions
The user running Terraform needs EC2, IAM, S3, and Secrets Manager write access.
For initial setup, temporarily attach `AdministratorAccess` to the IAM user, then
revoke after infrastructure is created.

### 1.3 Create an EC2 key pair (optional — SSM Session Manager works without it)
```bash
aws ec2 create-key-pair \
  --key-name gada-staging \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/gada-staging.pem
chmod 600 ~/.ssh/gada-staging.pem
```

---

## Phase 2 — Terraform Apply

### 2.1 Configure variables
```bash
cd infra/terraform/staging
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
- Set `allowed_ssh_cidrs` to your IP (run `curl -4 ifconfig.me`)
- Set `key_name = "gada-staging"` if you created a key pair

### 2.2 Initialize and apply
```bash
terraform init
terraform plan    # Review: ~15 resources
terraform apply   # Type 'yes' when prompted
```

Expected creation time: ~3–5 minutes.

### 2.3 Save outputs
```bash
terraform output  # Copy public_ip, instance_id, uploads_bucket, secret_arns
```

---

## Phase 3 — Secrets Population

Set values for each placeholder secret (EC2 doesn't start the app until secrets exist):

```bash
REGION=ap-southeast-1

# PostgreSQL connection string (use external RDS or Supabase for staging)
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/database-url \
  --secret-string 'postgres://gada_user:STRONG_PASSWORD@your-db-host:5432/gada_staging' \
  --region $REGION

# Firebase service account (base64-encoded JSON)
cat firebase-staging-sa.json | base64 | \
  aws secretsmanager put-secret-value \
  --secret-id /gada/staging/firebase-credentials \
  --secret-string file:///dev/stdin \
  --region $REGION

# JWT secret (random 64-char hex)
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/jwt-secret \
  --secret-string "$(openssl rand -hex 32)" \
  --region $REGION

# Redis URL (use ElastiCache, Upstash, or skip for staging-without-cache)
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/redis-url \
  --secret-string 'redis://localhost:6379' \
  --region $REGION

# S3 region (usually same as deployment region)
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/s3-region \
  --secret-string 'ap-southeast-1' \
  --region $REGION
```

---

## Phase 4 — First Deploy

### 4.1 SSH into instance
```bash
PUBLIC_IP=$(cd infra/terraform/staging && terraform output -raw public_ip)
ssh -i ~/.ssh/gada-staging.pem ec2-user@$PUBLIC_IP

# Or via SSM (no key needed):
INSTANCE_ID=$(cd infra/terraform/staging && terraform output -raw instance_id)
aws ssm start-session --target $INSTANCE_ID --region ap-southeast-1
```

### 4.2 Verify bootstrap completed
```bash
# On the instance:
tail -50 /var/log/user-data.log
node --version    # Should be v20.x
pnpm --version    # Should be v9.x
systemctl status nginx  # Should be active (running)
free -h           # Should show ~2G swap
```

### 4.3 Deploy the NestJS API
```bash
# On the instance (as ec2-user):
cd /opt/gada/api
git clone https://github.com/your-org/gada-vn.git . || git pull

# Install dependencies
pnpm install --filter=apps/api... --prod

# Build
cd apps/api && pnpm build

# Copy build output to /opt/gada/api
# (adjust paths to your repo structure)

# Start service
sudo systemctl enable gada-api
sudo systemctl start gada-api
sudo systemctl status gada-api
```

### 4.4 Verify API is running
```bash
# From local machine:
PUBLIC_IP=$(cd infra/terraform/staging && terraform output -raw public_ip)
curl http://$PUBLIC_IP:3000/v1/health
# Expected: {"statusCode":200,"data":{"status":"ok"}}

curl http://$PUBLIC_IP/api/v1/health  # Via nginx proxy
```

---

## Phase 5 — Ongoing Operations

### Scale up temporarily (load testing)
```bash
# Change instance type — requires stop → change → start
aws ec2 stop-instances --instance-ids $INSTANCE_ID --region ap-southeast-1
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID --region ap-southeast-1
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --instance-type '{"Value":"t3.medium"}' \
  --region ap-southeast-1
aws ec2 start-instances --instance-ids $INSTANCE_ID --region ap-southeast-1
```

### Rotate secrets
```bash
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/jwt-secret \
  --secret-string "$(openssl rand -hex 32)" \
  --region ap-southeast-1
# Then restart the API on the instance:
ssh ec2-user@$PUBLIC_IP 'sudo systemctl restart gada-api'
```

### Tear down when not needed
```bash
# Empty S3 first
BUCKET=$(cd infra/terraform/staging && terraform output -raw uploads_bucket)
aws s3 rm s3://$BUCKET --recursive

# Destroy all infrastructure
cd infra/terraform/staging
terraform destroy
```

---

## Dependency Graph

```
Phase 1 (Prerequisites)
  └── Phase 2 (terraform apply)
        ├── Phase 3 (populate secrets)   ← can be done in parallel with 4.1-4.2
        └── Phase 4 (first deploy)
              └── Phase 5 (operations)
```

Phase 3 secrets must be complete before the API can start successfully in Phase 4.3.
