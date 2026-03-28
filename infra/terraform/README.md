# Terraform — GADA VN Infrastructure

This directory contains all Terraform configuration for GADA VN's AWS infrastructure in `ap-southeast-1` (Singapore).

> **Rule:** never run `terraform apply` against production from a local machine. All production applies go through CI/CD (GitHub Actions with OIDC). Local runs are for staging only.

---

## Directory Structure

```
infra/terraform/
├── README.md                    ← this file
├── backend.tf                   # S3 remote state + DynamoDB lock table
├── provider.tf                  # AWS provider configuration + versions
├── main.tf                      # Root module — calls all submodules
├── variables.tf                 # Input variable declarations
├── outputs.tf                   # Output values (ALB DNS, RDS endpoint, etc.)
│
├── modules/
│   ├── networking/
│   │   ├── main.tf              # VPC, subnets, IGW, NAT GW, route tables, VPC endpoints
│   │   ├── variables.tf
│   │   └── outputs.tf           # vpc_id, subnet IDs, security group IDs
│   │
│   ├── ecs/
│   │   ├── main.tf              # Cluster, services, task definitions, autoscaling
│   │   ├── iam.tf               # Task execution role + task role (S3, Secrets Manager)
│   │   ├── variables.tf
│   │   └── outputs.tf           # cluster_arn, service ARNs
│   │
│   ├── rds/
│   │   ├── main.tf              # RDS instance, subnet group, parameter group, RDS Proxy
│   │   ├── variables.tf
│   │   └── outputs.tf           # proxy_endpoint, reader_endpoint
│   │
│   ├── elasticache/
│   │   ├── main.tf              # Redis replication group, subnet group
│   │   ├── variables.tf
│   │   └── outputs.tf           # primary_endpoint_address
│   │
│   ├── s3/
│   │   ├── main.tf              # All 5 buckets + lifecycle policies + CORS + versioning
│   │   ├── variables.tf
│   │   └── outputs.tf           # bucket ARNs, bucket names
│   │
│   ├── cloudfront/
│   │   ├── main.tf              # Distributions, cache behaviors, OAC, response headers policy
│   │   ├── variables.tf
│   │   └── outputs.tf           # distribution_id, domain_name
│   │
│   ├── waf/
│   │   ├── main.tf              # WebACL, managed rule groups, rate limit rules
│   │   ├── variables.tf
│   │   └── outputs.tf           # web_acl_arn
│   │
│   ├── alb/
│   │   ├── main.tf              # ALB, target groups (web/api), listeners, HTTPS redirect
│   │   ├── acm.tf               # ACM certificate for gada.vn (+ *.gada.vn SAN)
│   │   ├── variables.tf
│   │   └── outputs.tf           # alb_dns_name, alb_zone_id, target_group_arns
│   │
│   ├── monitoring/
│   │   ├── main.tf              # CloudWatch dashboards, alarms, SNS topics, log groups
│   │   ├── variables.tf
│   │   └── outputs.tf           # sns_topic_arn, dashboard_name
│   │
│   └── secrets/
│       ├── main.tf              # Secrets Manager secrets (empty values — populated manually)
│       ├── variables.tf
│       └── outputs.tf           # secret ARNs (sensitive = true)
│
└── environments/
    ├── production/
    │   ├── terraform.tfvars     # prod-specific values (instance sizes, min/max tasks)
    │   └── backend.tfvars       # S3 state bucket + key for production
    └── staging/
        ├── terraform.tfvars     # smaller instances, Fargate Spot enabled
        └── backend.tfvars       # S3 state bucket + key for staging
```

---

## Prerequisites

| Tool | Minimum Version | Install |
|---|---|---|
| Terraform | >= 1.7.0 | `brew install terraform` or [tfenv](https://github.com/tfutils/tfenv) |
| AWS CLI | v2.x | `brew install awscli` |
| Docker | 24.x | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |

**AWS access:** configure the GitHub OIDC role for CI/CD. For local staging work, use AWS SSO:

```bash
aws sso login --profile gada-staging
export AWS_PROFILE=gada-staging
```

Never configure long-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` for humans. Use IAM Identity Center (SSO).

---

## Quick Start

### Step 1: Bootstrap (one-time, manual)

Before Terraform can manage state, the S3 state bucket and DynamoDB lock table must exist. These are created manually once per AWS account:

```bash
# Create state bucket (versioning + encryption required)
aws s3api create-bucket \
  --bucket gada-vn-tf-state \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-bucket-versioning \
  --bucket gada-vn-tf-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket gada-vn-tf-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms","KMSMasterKeyID":"alias/terraform-state"}}]}'

aws s3api put-public-access-block \
  --bucket gada-vn-tf-state \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name gada-vn-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

### Step 2: Initialize

```bash
cd infra/terraform

terraform init -backend-config=environments/production/backend.tfvars
```

This downloads the AWS provider (~500MB first time) and configures S3 remote state.

### Step 3: Plan

```bash
terraform plan -var-file=environments/production/terraform.tfvars
```

Review the plan carefully. Check for any unexpected destroys (indicated by `-` in red). Never apply a plan with unexpected destroys in production.

### Step 4: First Deploy (Layered Apply)

Apply modules in dependency order. Applying everything at once can cause race conditions where compute tries to start before networking exists.

**Layer 1 — Networking (no dependencies):**
```bash
terraform apply -target=module.networking \
  -var-file=environments/production/terraform.tfvars
```

**Layer 2 — Data layer (depends on networking):**
```bash
terraform apply \
  -target=module.secrets \
  -target=module.s3 \
  -target=module.rds \
  -target=module.elasticache \
  -var-file=environments/production/terraform.tfvars
```

Wait for RDS to become available (~10 minutes for first provision).

**Layer 3 — Compute and CDN (depends on networking + data):**
```bash
terraform apply \
  -target=module.alb \
  -target=module.ecs \
  -target=module.cloudfront \
  -var-file=environments/production/terraform.tfvars
```

**Layer 4 — Security (WAF must reference CloudFront ARN):**
```bash
terraform apply -target=module.waf \
  -var-file=environments/production/terraform.tfvars
```

**Layer 5 — Monitoring (depends on all services existing):**
```bash
terraform apply -target=module.monitoring \
  -var-file=environments/production/terraform.tfvars
```

**Full apply (verifies nothing was missed):**
```bash
terraform apply -var-file=environments/production/terraform.tfvars
```

### Step 5: Populate Secrets (Manual)

Terraform creates empty Secrets Manager secrets. Populate them manually via AWS Console or CLI — never put secret values in tfvars files:

```bash
aws secretsmanager put-secret-value \
  --secret-id /gada/production/db \
  --secret-string '{"host":"<rds-proxy-endpoint>","port":5432,"database":"gada","username":"gada_app","password":"<generated>"}'

aws secretsmanager put-secret-value \
  --secret-id /gada/production/app \
  --secret-string '{"APP_KEY":"base64:<key>","ENCRYPTION_KEY":"<64-hex-chars>"}'

# Repeat for /gada/production/redis, /firebase, /aws, /fcm
```

---

## Variables Reference

All variables are declared in `variables.tf`. Environments provide values via `terraform.tfvars`.

| Variable | Type | Production Default | Staging Default | Description |
|---|---|---|---|---|
| `environment` | string | `"production"` | `"staging"` | Environment name; used in resource names and tags |
| `aws_region` | string | `"ap-southeast-1"` | `"ap-southeast-1"` | AWS region for all resources |
| `vpc_cidr` | string | `"10.0.0.0/16"` | `"10.2.0.0/16"` | VPC CIDR block |
| `db_instance_class` | string | `"db.r6g.large"` | `"db.t4g.micro"` | RDS instance type |
| `db_allocated_storage` | number | `100` | `20` | RDS initial storage in GB |
| `db_max_allocated_storage` | number | `1000` | `100` | RDS storage autoscale ceiling in GB |
| `redis_node_type` | string | `"cache.r6g.small"` | `"cache.t4g.micro"` | ElastiCache node type |
| `ecs_web_min_tasks` | number | `2` | `1` | Web service minimum running tasks |
| `ecs_web_max_tasks` | number | `10` | `3` | Web service maximum tasks (autoscaling ceiling) |
| `ecs_api_min_tasks` | number | `2` | `1` | API service minimum running tasks |
| `ecs_api_max_tasks` | number | `20` | `5` | API service maximum tasks |
| `ecs_worker_min_tasks` | number | `1` | `1` | Queue worker minimum tasks |
| `ecs_worker_max_tasks` | number | `5` | `2` | Queue worker maximum tasks |
| `ecr_image_tag` | string | `"latest"` | `"latest"` | ECR image tag to deploy (CI/CD overrides with git SHA) |
| `enable_fargate_spot` | bool | `false` | `true` | Enable Fargate Spot for queue-worker (-70% cost) |
| `enable_rds_proxy` | bool | `true` | `false` | Enable RDS Proxy (not needed for staging) |
| `enable_multi_az` | bool | `true` | `false` | Enable RDS Multi-AZ standby |
| `rds_backup_retention_days` | number | `7` | `1` | Automated RDS backup retention |
| `cloudfront_price_class` | string | `"PriceClass_200"` | `"PriceClass_100"` | CloudFront PoP coverage |
| `alert_email` | string | — | — | SNS subscription email for CloudWatch alarms |
| `domain_name` | string | `"gada.vn"` | `"staging.gada.vn"` | Primary domain (ACM + Route 53) |

---

## Configuration Files

### `backend.tf`

```hcl
terraform {
  backend "s3" {
    bucket         = "gada-vn-tf-state"
    key            = "production/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    kms_key_id     = "alias/terraform-state"
    dynamodb_table = "gada-vn-tf-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  required_version = ">= 1.7.0"
}
```

### `provider.tf`

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "gada-vn"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# us-east-1 required for Lambda@Edge and WAF (CloudFront scope)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "gada-vn"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
```

### `environments/production/backend.tfvars`

```hcl
bucket         = "gada-vn-tf-state"
key            = "production/terraform.tfstate"
region         = "ap-southeast-1"
encrypt        = true
kms_key_id     = "alias/terraform-state"
dynamodb_table = "gada-vn-tf-locks"
```

### `environments/staging/backend.tfvars`

```hcl
bucket         = "gada-vn-tf-state"
key            = "staging/terraform.tfstate"
region         = "ap-southeast-1"
encrypt        = true
kms_key_id     = "alias/terraform-state"
dynamodb_table = "gada-vn-tf-locks"
```

---

## Module Reference

### Root `main.tf` — Sample Module Calls

```hcl
module "networking" {
  source      = "./modules/networking"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  aws_region  = var.aws_region
}

module "secrets" {
  source      = "./modules/secrets"
  environment = var.environment
}

module "s3" {
  source      = "./modules/s3"
  environment = var.environment
  aws_region  = var.aws_region
}

module "rds" {
  source                 = "./modules/rds"
  environment            = var.environment
  vpc_id                 = module.networking.vpc_id
  subnet_ids             = module.networking.private_data_subnet_ids
  security_group_id      = module.networking.sg_rds_id
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = var.db_max_allocated_storage
  multi_az               = var.enable_multi_az
  backup_retention_days  = var.rds_backup_retention_days
  enable_rds_proxy       = var.enable_rds_proxy
  db_secret_arn          = module.secrets.db_secret_arn

  depends_on = [module.networking, module.secrets]
}

module "elasticache" {
  source            = "./modules/elasticache"
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  subnet_ids        = module.networking.private_data_subnet_ids
  security_group_id = module.networking.sg_redis_id
  node_type         = var.redis_node_type

  depends_on = [module.networking]
}

module "alb" {
  source            = "./modules/alb"
  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  security_group_id = module.networking.sg_alb_id
  domain_name       = var.domain_name

  depends_on = [module.networking]
}

module "ecs" {
  source                    = "./modules/ecs"
  environment               = var.environment
  vpc_id                    = module.networking.vpc_id
  private_app_subnet_ids    = module.networking.private_app_subnet_ids
  sg_ecs_web_id             = module.networking.sg_ecs_web_id
  sg_ecs_api_id             = module.networking.sg_ecs_api_id
  alb_web_target_group_arn  = module.alb.web_target_group_arn
  alb_api_target_group_arn  = module.alb.api_target_group_arn
  ecr_image_tag             = var.ecr_image_tag
  web_min_tasks             = var.ecs_web_min_tasks
  web_max_tasks             = var.ecs_web_max_tasks
  api_min_tasks             = var.ecs_api_min_tasks
  api_max_tasks             = var.ecs_api_max_tasks
  worker_min_tasks          = var.ecs_worker_min_tasks
  worker_max_tasks          = var.ecs_worker_max_tasks
  enable_fargate_spot       = var.enable_fargate_spot
  secrets_arns              = module.secrets.all_secret_arns
  assets_bucket_arn         = module.s3.assets_bucket_arn

  depends_on = [module.networking, module.alb, module.secrets, module.s3]
}

module "cloudfront" {
  source              = "./modules/cloudfront"
  environment         = var.environment
  alb_dns_name        = module.alb.alb_dns_name
  static_bucket_name  = module.s3.web_static_bucket_name
  assets_bucket_name  = module.s3.assets_bucket_name
  web_acl_arn         = module.waf.web_acl_arn
  price_class         = var.cloudfront_price_class
  domain_name         = var.domain_name

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  depends_on = [module.alb, module.s3, module.waf]
}

module "waf" {
  source      = "./modules/waf"
  environment = var.environment

  # WAF for CloudFront must be created in us-east-1
  providers = {
    aws = aws.us_east_1
  }
}

module "monitoring" {
  source            = "./modules/monitoring"
  environment       = var.environment
  alert_email       = var.alert_email
  ecs_cluster_name  = module.ecs.cluster_name
  rds_identifier    = module.rds.db_identifier
  redis_cluster_id  = module.elasticache.cluster_id
  alb_arn_suffix    = module.alb.arn_suffix
  cf_distribution_id = module.cloudfront.distribution_id

  depends_on = [module.ecs, module.rds, module.elasticache, module.alb, module.cloudfront]
}
```

---

## Deployment Commands

### Normal Deployments (CI/CD — do not run locally against production)

CI/CD uses GitHub Actions with OIDC. Image tags are set to git SHA:

```bash
# Applied by deploy-production.yml workflow — not for manual use in production
terraform apply \
  -var="ecr_image_tag=${{ github.sha }}" \
  -var-file=environments/production/terraform.tfvars \
  -auto-approve
```

### Update ECS Task Definition Only (e.g., new image tag)

```bash
# Scoped apply — only touches ECS module, does not plan RDS/Redis/etc.
terraform apply \
  -var="ecr_image_tag=abc1234f" \
  -target=module.ecs \
  -var-file=environments/production/terraform.tfvars
```

### Staging Management

```bash
# Initialize staging
terraform init -backend-config=environments/staging/backend.tfvars

# Plan staging
terraform plan -var-file=environments/staging/terraform.tfvars

# Apply staging
terraform apply -var-file=environments/staging/terraform.tfvars

# Destroy staging (cost saving — destroy after PR merge or on weekends)
terraform destroy \
  -var-file=environments/staging/terraform.tfvars \
  -auto-approve
```

### Emergency Production Rollback

```bash
# Roll back ECS to previous task definition revision
terraform apply \
  -var="ecr_image_tag=<previous-sha>" \
  -target=module.ecs \
  -var-file=environments/production/terraform.tfvars
```

---

## State Management

### Remote State in S3

State is stored in `s3://gada-vn-tf-state` with:
- Versioning enabled (every apply creates a new state version)
- SSE-KMS encryption (alias `terraform-state`)
- DynamoDB lock table `gada-vn-tf-locks` (prevents concurrent applies)

If `terraform apply` is interrupted, the DynamoDB lock may remain. Release it:

```bash
# Only if the lock is stale (the process that acquired it is confirmed dead)
terraform force-unlock <LOCK_ID>
```

### Sensitive Outputs

All outputs containing secrets or endpoints that should not appear in CI/CD logs use `sensitive = true`:

```hcl
output "db_proxy_endpoint" {
  value     = module.rds.proxy_endpoint
  sensitive = true
}
```

Sensitive outputs are not shown in `terraform plan` or `terraform apply` output. Access them via:

```bash
terraform output -raw db_proxy_endpoint
```

### Workspace Strategy

This project uses a **directory-based environment strategy** (`environments/production/` vs `environments/staging/`) rather than Terraform workspaces. This provides cleaner separation and avoids accidental applies to the wrong environment.

Never use `terraform workspace select` — always switch environments by changing backend config:

```bash
# Production
terraform init -reconfigure -backend-config=environments/production/backend.tfvars

# Staging
terraform init -reconfigure -backend-config=environments/staging/backend.tfvars
```

---

## Adding a New Module

1. Create `modules/<module-name>/` directory with `main.tf`, `variables.tf`, `outputs.tf`
2. Add module call to `main.tf` with explicit `depends_on`
3. Add any new input variables to `variables.tf` and both `terraform.tfvars` files
4. Test on staging first: `terraform plan -target=module.<module-name> -var-file=environments/staging/terraform.tfvars`
5. Submit PR — Atlantis (or GitHub Actions) will post a plan comment for review

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `Error: Error acquiring the state lock` | Stale DynamoDB lock | `terraform force-unlock <LOCK_ID>` (verify process is dead first) |
| `Error: creating ECS Service: InvalidParameterException` | Subnets not in correct AZ | Verify `private_app_subnet_ids` output from networking module |
| `Error: ACM certificate not validated` | DNS validation record not propagated | Check Route 53 for CNAME record; wait up to 30 minutes for propagation |
| `Error: RDS storage can only be increased` | Tried to reduce `db_allocated_storage` | RDS storage cannot be decreased; set `db_allocated_storage` back to current or higher value |
| CloudFront returns 403 on S3 assets | OAC not attached or S3 bucket policy missing | Verify `aws_cloudfront_origin_access_control` is linked in the distribution |
| ECS tasks failing health check | App not started, wrong port | Check ECS task logs in CloudWatch `/gada-vn/ecs/<service>` |
