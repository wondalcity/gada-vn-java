# Staging Server Access Guide

## Current Instance

| Field | Value |
|-------|-------|
| **Instance ID** | `i-060b635518a854b74` |
| **Public IP (EIP)** | `52.76.20.8` |
| **Public DNS** | `ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com` |
| **Region** | `ap-southeast-1` |
| **AMI** | AL2023 arm64 (`ami-052b3a986dfeeaaf2`) |
| **Instance Type** | `t4g.small` (Graviton2, 2 vCPU, 2 GB RAM) |

> To get the latest values after any Terraform change:
> ```bash
> cd infra/terraform/staging && terraform output
> ```

---

## Access Methods (Priority Order)

### 1. AWS Systems Manager Session Manager — PRIMARY ✅

**No SSH key, no open port 22, no bastion required.**

Session Manager works via the instance's IAM role (`AmazonSSMManagedInstanceCore`)
over outbound HTTPS to AWS endpoints. The instance requires no inbound ports for this.

**Quick connect:**
```bash
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1
```

**Prerequisites on your local machine:**
- AWS CLI v2 configured with `wonyuep` credentials
- `session-manager-plugin` installed (see `session-manager-checklist.md`)

**Verify the instance is reachable before connecting:**
```bash
aws ssm get-connection-status \
  --target i-060b635518a854b74 \
  --region ap-southeast-1
# Expected: "Status": "connected"
```

---

### 2. SSH via Direct IP — FALLBACK ⚠️

Only available when `key_name` is configured in `terraform.tfvars`.
Port 22 is restricted to `allowed_ingress_cidrs` (currently `220.79.183.141/32`).

```bash
ssh -i ~/.ssh/gada-staging.pem ec2-user@52.76.20.8
```

See `fallback-ssh-guide.md` for full setup.

---

## Common Administration Tasks

### View bootstrap log
```bash
# Via Session Manager:
aws ssm start-session --target i-060b635518a854b74 --region ap-southeast-1
# Then inside the session:
sudo tail -100 /var/log/user-data.log
```

### Check service status
```bash
# Inside Session Manager session:
systemctl status amazon-ssm-agent
systemctl status nginx
systemctl status gada-api  # will show "inactive" until first deploy
```

### View API logs
```bash
# Inside session:
tail -f /var/log/gada-api.log

# Or from CloudWatch (locally):
aws logs tail /gada/staging/api --follow --region ap-southeast-1
```

### Read a secret from the instance
```bash
# Inside session (IAM role has permission, no credentials needed):
aws secretsmanager get-secret-value \
  --secret-id /gada/staging/database-url \
  --query SecretString --output text \
  --region ap-southeast-1
```

### Run a one-off command without an interactive session
```bash
aws ssm send-command \
  --instance-ids i-060b635518a854b74 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["systemctl status nginx"]' \
  --region ap-southeast-1 \
  --query 'Command.CommandId' --output text

# Then get output (replace COMMAND_ID):
aws ssm get-command-invocation \
  --instance-id i-060b635518a854b74 \
  --command-id COMMAND_ID \
  --region ap-southeast-1 \
  --query '{Status:Status,Output:StandardOutputContent}'
```

### Stop/start instance (cost saving)
```bash
aws ec2 stop-instances  --instance-ids i-060b635518a854b74 --region ap-southeast-1
aws ec2 start-instances --instance-ids i-060b635518a854b74 --region ap-southeast-1
# EIP stays associated — public IP does not change
```

### Upload a file to the instance
```bash
# Session Manager supports file transfer via the plugin:
aws ssm start-session \
  --target i-060b635518a854b74 \
  --document-name AWS-StartSSHSession \
  --parameters portNumber=22 \
  --region ap-southeast-1
# (requires SSH key — see fallback-ssh-guide.md)

# Alternatively: upload to S3 then pull from instance
aws s3 cp ./myfile.tar.gz s3://gada-vn-staging-uploads/deploys/myfile.tar.gz
# Then inside session:
aws s3 cp s3://gada-vn-staging-uploads/deploys/myfile.tar.gz /opt/gada/ --region ap-southeast-1
```

---

## Instance IAM Role Permissions Summary

The instance profile `gada-vn-staging-app-profile` gives the EC2 instance:

| Permission | Scope |
|-----------|-------|
| SSM Session Manager | `AmazonSSMManagedInstanceCore` (managed policy) |
| CloudWatch Logs write | `/gada/staging/*` log groups |
| CloudWatch agent metrics | `GADA/Staging` namespace |
| S3 read/write | `gada-vn-staging-uploads` bucket only |
| Secrets Manager read | `/gada/staging/*` secrets only |
| SSM managed (patching, run command) | `AmazonSSMManagedInstanceCore` |

---

## Security Posture

| Control | Status |
|---------|--------|
| No SSH key required for access | ✅ (SSM is primary) |
| Port 22 inbound | Open only to `220.79.183.141/32` |
| IMDSv2 enforced | ✅ (HttpTokens: required) |
| EBS root volume encrypted | ✅ (gp3, AES-256) |
| All outbound allowed | ✅ (required for SSM + package installs) |
| Instance profile scoped | ✅ (S3/Secrets/Logs — not wildcard) |
