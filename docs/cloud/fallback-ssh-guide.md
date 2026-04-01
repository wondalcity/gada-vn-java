# Fallback SSH Access Guide

**SSH is a fallback only.** Prefer Session Manager (see `session-manager-checklist.md`).
Use SSH when Session Manager is unavailable (SSM agent down, IAM issue, plugin not installed).

---

## Why SSH is a Fallback

| | Session Manager | SSH |
|-|----------------|-----|
| Key pair required | No | Yes |
| Port 22 inbound open | No | Yes (security risk) |
| Audit log (CloudTrail) | Yes | No |
| Works if SSM agent down | Yes (via console) | Yes |
| Requires internet on client | No (can use VPC) | Yes |

---

## Step 1: Create the Key Pair

**Do this once per environment.** The private key cannot be retrieved after creation.

```bash
# Create key pair and save private key
aws ec2 create-key-pair \
  --key-name gada-staging \
  --region ap-southeast-1 \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/gada-staging.pem

# Set permissions (required by SSH)
chmod 600 ~/.ssh/gada-staging.pem

# Verify it was created
aws ec2 describe-key-pairs \
  --key-names gada-staging \
  --region ap-southeast-1
```

> **IMPORTANT:** Back up `~/.ssh/gada-staging.pem` securely (1Password, Bitwarden, etc.).
> AWS does not store the private key — losing it means you cannot SSH into the instance.

---

## Step 2: Configure Terraform to Use the Key Pair

Edit `infra/terraform/staging/terraform.tfvars`:
```hcl
key_name = "gada-staging"
```

Apply:
```bash
cd infra/terraform/staging
terraform apply
```

This will update the instance in-place — **no instance replacement required**.

---

## Step 3: Verify Your IP is Allowed

Port 22 is restricted to `allowed_ingress_cidrs`. Check your current IP:
```bash
curl -4 ifconfig.me
```

If the output IP is not in `terraform.tfvars`, add it:
```hcl
allowed_ingress_cidrs = ["YOUR.IP.HERE/32"]
```

Then apply: `terraform apply`

---

## Step 4: Connect

```bash
ssh -i ~/.ssh/gada-staging.pem ec2-user@52.76.20.8
```

Or with the DNS hostname (same, more readable):
```bash
ssh -i ~/.ssh/gada-staging.pem ec2-user@ec2-52-76-20-8.ap-southeast-1.compute.amazonaws.com
```

### Optional: `~/.ssh/config` entry

```
Host gada-staging
  HostName 52.76.20.8
  User ec2-user
  IdentityFile ~/.ssh/gada-staging.pem
  ServerAliveInterval 60
  ServerAliveCountMax 3
```

Then simply:
```bash
ssh gada-staging
scp localfile.txt gada-staging:/tmp/
```

---

## Step 5: SSH Tunneling for Port Forwarding

Useful for accessing internal services (e.g., local DB, internal API) without exposing them publicly.

```bash
# Forward local port 5432 to a remote PostgreSQL (not on the instance itself)
ssh -i ~/.ssh/gada-staging.pem -L 5432:your-db-host:5432 ec2-user@52.76.20.8 -N

# Forward local port 3000 to the NestJS API on the instance
ssh -i ~/.ssh/gada-staging.pem -L 3000:localhost:3000 ec2-user@52.76.20.8 -N
```

---

## When SSH Doesn't Work

### "Permission denied (publickey)"
- Wrong key file: confirm you're using `~/.ssh/gada-staging.pem`
- Key not configured in Terraform: check `key_name` in `terraform.tfvars`
- Launched before key was set: instance must be replaced after adding `key_name`
  ```bash
  cd infra/terraform/staging
  terraform taint aws_instance.app && terraform taint aws_eip.instance
  terraform apply
  ```

### "Connection refused" on port 22
- Your IP is not in `allowed_ingress_cidrs`: update tfvars and apply
- Instance is stopped: `aws ec2 start-instances --instance-ids i-060b635518a854b74 --region ap-southeast-1`

### "Connection timed out"
- Security group blocks your IP — update `allowed_ingress_cidrs`
- Instance has no public IP — check EIP association:
  ```bash
  aws ec2 describe-addresses --region ap-southeast-1 \
    --query 'Addresses[?InstanceId==`i-060b635518a854b74`].PublicIp' --output text
  ```

### Lost the private key

1. Create a new key pair:
   ```bash
   aws ec2 create-key-pair --key-name gada-staging-v2 \
     --region ap-southeast-1 --query 'KeyMaterial' --output text \
     > ~/.ssh/gada-staging-v2.pem && chmod 600 ~/.ssh/gada-staging-v2.pem
   ```

2. **If you still have Session Manager access**: inject the new key via SSM:
   ```bash
   PUBKEY=$(ssh-keygen -y -f ~/.ssh/gada-staging-v2.pem)
   aws ssm send-command \
     --instance-ids i-060b635518a854b74 \
     --document-name "AWS-RunShellScript" \
     --parameters "commands=[\"echo '$PUBKEY' >> /home/ec2-user/.ssh/authorized_keys\"]" \
     --region ap-southeast-1
   ```

3. **If no SSM access either**: replace the instance:
   ```bash
   cd infra/terraform/staging
   # Update key_name in terraform.tfvars to the new key
   terraform taint aws_instance.app && terraform taint aws_eip.instance
   terraform apply
   ```

---

## Current State Reference

| Item | Value |
|------|-------|
| Instance ID | `i-060b635518a854b74` |
| Public IP | `52.76.20.8` |
| SSH user | `ec2-user` |
| key_name | not configured (SSH disabled until set) |
| allowed_ingress_cidrs | `220.79.183.141/32` |
| SSH port | 22 |
