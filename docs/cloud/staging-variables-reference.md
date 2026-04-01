# Staging Terraform — Variables Reference

All variables are defined in `infra/terraform/staging/variables.tf`.
Set values in `terraform.tfvars` (gitignored, copy from `terraform.tfvars.example`).

## Core Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `aws_region` | string | `ap-southeast-1` | AWS region |
| `project` | string | `gada-vn` | Project name prefix for all resource names |
| `environment` | string | `staging` | Environment label (staging / prod) |

## Networking

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `vpc_cidr` | string | `10.10.0.0/16` | VPC CIDR block |
| `public_subnet_cidr` | string | `10.10.1.0/24` | Single public subnet CIDR |
| `availability_zone` | string | `ap-southeast-1a` | AZ for the subnet and instance |

## EC2

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `instance_type` | string | `t3.small` | EC2 instance type. `t3.small` = 2 vCPU, 2 GB RAM |
| `ami_id` | string | `""` | Override AMI ID. Empty = auto-detect latest AL2023 x86_64 |
| `key_name` | string | `""` | EC2 key pair name for SSH. Empty = no key pair (SSM only) |
| `root_volume_size_gb` | number | `20` | Root EBS volume size in GB (gp3, encrypted) |
| `enable_detailed_monitoring` | bool | `false` | CloudWatch 1-min metrics (extra cost) |

### Choosing an instance type

| Type | vCPU | RAM | Use case |
|------|------|-----|----------|
| `t3.micro` | 2 | 1 GB | Development only — OOM risk with Node.js |
| `t3.small` | 2 | 2 GB | **Recommended for staging** |
| `t3.medium` | 2 | 4 GB | Load testing or multiple services |

## Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `allowed_ssh_cidrs` | list(string) | `[]` | CIDRs allowed SSH inbound. Empty = no SSH rule |
| `allowed_http_cidrs` | list(string) | `["0.0.0.0/0"]` | CIDRs allowed HTTP/HTTPS inbound |

**Finding your public IP:**
```bash
curl -4 ifconfig.me
# Output: 1.2.3.4
# Set: allowed_ssh_cidrs = ["1.2.3.4/32"]
```

## S3

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `s3_uploads_bucket` | string | `""` | Bucket name. Empty = `<project>-<environment>-uploads` |

S3 bucket name must be globally unique. If `gada-vn-staging-uploads` is taken, set a custom name.

## Outputs Reference

After `terraform apply` or `terraform output`:

| Output | Description |
|--------|-------------|
| `instance_id` | EC2 instance ID (e.g. `i-0abc123`) |
| `public_ip` | Elastic IP address (stable) |
| `public_dns` | EC2 public DNS hostname |
| `vpc_id` | VPC ID |
| `subnet_id` | Public subnet ID |
| `security_group_id` | App server SG ID |
| `iam_role_arn` | IAM role ARN attached to EC2 |
| `uploads_bucket` | S3 bucket name |
| `secret_arns` | Map of secret name → ARN |
| `ssh_command` | Ready-to-use SSH command |
| `api_url` | Direct API URL (`http://<ip>:3000`) |

## Locals (auto-computed, not configurable)

| Local | Value | Description |
|-------|-------|-------------|
| `name_prefix` | `${project}-${environment}` | Prefix for all resource names |
| `uploads_bucket` | variable or `${name_prefix}-uploads` | Resolved bucket name |
| `ami_id` | variable or latest AL2023 | Resolved AMI |
| `common_tags` | Project/Environment/ManagedBy | Applied to all resources |
