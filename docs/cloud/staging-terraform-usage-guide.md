# Staging Infrastructure — Terraform Usage Guide

## Overview

The staging environment runs on a single EC2 instance (`t3.small`) in `ap-southeast-1`.
There is no load balancer, RDS, ElastiCache, or NAT Gateway — keeping monthly cost under ~$25 USD.

```
Internet → EIP → EC2 (nginx :80 → NestJS :3000)
                  └── IAM role → S3, Secrets Manager, CloudWatch
```

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Terraform | 1.5.0 | `brew install hashicorp/tap/terraform` |
| AWS CLI | 2.x | `brew install awscli` |
| AWS credentials | — | `aws configure` or env vars |

### IAM permissions required for `terraform apply`

The AWS user or role running Terraform needs at minimum:

```
ec2:* (VPC, subnet, SG, instance, EIP, AMI describe)
iam:CreateRole, iam:AttachRolePolicy, iam:PutRolePolicy, iam:CreateInstanceProfile, iam:AddRoleToInstanceProfile, iam:PassRole
s3:CreateBucket, s3:PutBucket*, s3:GetBucket*
secretsmanager:CreateSecret, secretsmanager:TagResource
```

If using the `wonyuep` IAM user with limited permissions, attach the `AdministratorAccess` policy temporarily for the initial `apply`, then revoke it.

## First-time Setup

```bash
cd infra/terraform/staging

# 1. Copy and edit tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — at minimum set allowed_ssh_cidrs to your IP

# 2. Create EC2 key pair (skip if already exists)
aws ec2 create-key-pair --key-name gada-staging \
  --query 'KeyMaterial' --output text > ~/.ssh/gada-staging.pem
chmod 600 ~/.ssh/gada-staging.pem

# 3. Initialize Terraform
terraform init

# 4. Plan (review what will be created)
terraform plan

# 5. Apply
terraform apply
```

After apply, note the outputs:
- `public_ip` — EIP, stable across stops/starts
- `ssh_command` — ready-to-use SSH command

## Day-to-Day Operations

### SSH into the instance
```bash
ssh -i ~/.ssh/gada-staging.pem ec2-user@$(terraform output -raw public_ip)
```

Or use AWS Session Manager (no SSH key needed, requires SSM agent which is pre-installed):
```bash
aws ssm start-session --target $(terraform output -raw instance_id) --region ap-southeast-1
```

### Deploy the API
```bash
# On the EC2 instance:
cd /opt/gada/api
git pull origin main
pnpm install --prod
pnpm build
systemctl restart gada-api
```

### View logs
```bash
# On instance:
journalctl -u gada-api -f
tail -f /var/log/gada-api.log

# CloudWatch (from local machine):
aws logs tail /gada/staging/api --follow --region ap-southeast-1
```

### Stop/start the instance (saves ~$0.02/hour when not in use)
```bash
aws ec2 stop-instances  --instance-ids $(terraform output -raw instance_id) --region ap-southeast-1
aws ec2 start-instances --instance-ids $(terraform output -raw instance_id) --region ap-southeast-1
```
The EIP remains associated — public IP does not change.

## Secrets Management

Secrets are created as empty placeholders by Terraform. Set values manually:

```bash
# List all staging secrets
aws secretsmanager list-secrets --filter Key=name,Values=/gada/staging \
  --region ap-southeast-1 --query 'SecretList[].Name' --output text

# Set a secret value
aws secretsmanager put-secret-value \
  --secret-id /gada/staging/database-url \
  --secret-string 'postgres://gada:password@host:5432/gada_staging' \
  --region ap-southeast-1

# Read on EC2 (via IAM role, no credentials needed):
aws secretsmanager get-secret-value \
  --secret-id /gada/staging/database-url \
  --query SecretString --output text --region ap-southeast-1
```

## Tear Down

```bash
# Remove all resources (EIP, EC2, VPC, S3, secrets)
terraform destroy

# Note: recovery_window_in_days = 0 allows immediate secret deletion
# Note: S3 bucket must be empty first:
aws s3 rm s3://gada-vn-staging-uploads --recursive
```

## Cost Estimate (ap-southeast-1, monthly)

| Resource | ~Cost/month |
|----------|------------|
| t3.small (24×7) | $15.04 |
| EIP (attached) | $0 |
| EIP (unattached) | $3.65/mo |
| gp3 20 GB EBS | $1.60 |
| S3 (<10 GB) | <$1 |
| CloudWatch Logs | <$1 |
| **Total** | **~$18–20** |

Stopping the instance when not in use (~12h/day) cuts EC2 cost in half to ~$7.50/month.
