# Session Manager Checklist

Verify all requirements before attempting `aws ssm start-session`.

---

## Instance Side (pre-verified in Terraform)

- [x] **IAM role attached**: `gada-vn-staging-app-profile`
- [x] **Managed policy**: `AmazonSSMManagedInstanceCore` attached to role
- [x] **SSM agent installed**: `dnf install -y amazon-ssm-agent` in user_data
- [x] **SSM agent enabled**: `systemctl enable amazon-ssm-agent`
- [x] **Outbound HTTPS**: security group allows all outbound (`0.0.0.0/0`)
- [x] **Internet access**: public subnet + EIP + IGW
- [x] **IMDSv2 compatible**: SSM agent 3.x supports IMDSv2

### Verify instance is online
```bash
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=i-060b635518a854b74" \
  --region ap-southeast-1 \
  --query 'InstanceInformationList[0].{PingStatus:PingStatus,AgentVersion:AgentVersion}' \
  --output json
```
Expected:
```json
{
  "PingStatus": "Online",
  "AgentVersion": "3.3.x.x"
}
```

If `PingStatus` is missing or `"ConnectionLost"` — see **Troubleshooting** below.

---

## Local Machine Setup

### Step 1: AWS CLI v2

```bash
aws --version
# Must be: aws-cli/2.x.x
```

Install if needed:
```bash
brew install awscli          # macOS
# or: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
```

Configure credentials:
```bash
aws configure
# Access Key ID:     AKIA...
# Secret Access Key: ...
# Default region:    ap-southeast-1
# Output format:     json

# Verify:
aws sts get-caller-identity
```

### Step 2: Session Manager Plugin

The plugin is a separate binary required by `aws ssm start-session`.

```bash
# Check if installed:
session-manager-plugin --version
```

**Install on macOS (ARM or Intel):**
```bash
# Download
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac_arm64/session-manager-plugin.pkg" \
  -o /tmp/session-manager-plugin.pkg

# Install
sudo installer -pkg /tmp/session-manager-plugin.pkg -target /

# Verify
session-manager-plugin --version
```

For Intel Mac: replace `mac_arm64` with `mac`.

**Install on Linux (x86_64):**
```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" \
  -o /tmp/ssm-plugin.deb
sudo dpkg -i /tmp/ssm-plugin.deb
```

### Step 3: IAM Permission

The AWS user connecting needs `ssm:StartSession`.

Check:
```bash
aws ssm get-connection-status \
  --target i-060b635518a854b74 \
  --region ap-southeast-1
```

If `AccessDenied` — attach this inline policy to your IAM user:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ssm:StartSession",
      "ssm:SendCommand",
      "ssm:GetCommandInvocation",
      "ssm:DescribeInstanceInformation",
      "ssm:GetConnectionStatus"
    ],
    "Resource": "*"
  }]
}
```

---

## Connecting

```bash
# Interactive shell session
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1

# You will get a shell as: ssm-user (or ec2-user depending on config)
# Switch to ec2-user:
sudo su - ec2-user
```

### SSH tunneling via Session Manager (no open port 22 required)
Add this to `~/.ssh/config`:
```
Host gada-staging
  HostName i-060b635518a854b74
  User ec2-user
  IdentityFile ~/.ssh/gada-staging.pem
  ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p' --region ap-southeast-1"
```

Then:
```bash
ssh gada-staging
scp localfile.txt gada-staging:/tmp/
```

---

## Troubleshooting

### "TargetNotConnected" or PingStatus not "Online"

**Check 1 — Is the instance running?**
```bash
aws ec2 describe-instances \
  --instance-ids i-060b635518a854b74 \
  --region ap-southeast-1 \
  --query 'Reservations[0].Instances[0].State.Name' --output text
# Expected: running
```

**Check 2 — Did bootstrap succeed?**
```bash
aws ec2 get-console-output \
  --instance-id i-060b635518a854b74 \
  --latest \
  --region ap-southeast-1 \
  --query 'Output' --output text | grep -E "ssm|SSM|OK|WARN|Bootstrap complete"
```
Look for: `[OK] amazon-ssm-agent started` and `Bootstrap complete`.

**Check 3 — Wait longer**
SSM registration takes 1–3 minutes after agent start. If instance just launched:
```bash
# Poll every 30s
watch -n 30 "aws ssm get-connection-status --target i-060b635518a854b74 --region ap-southeast-1"
```

**Check 4 — Force restart via EC2 reboot**
```bash
aws ec2 reboot-instances --instance-ids i-060b635518a854b74 --region ap-southeast-1
# Wait 2 minutes, then re-check
```

**Check 5 — IAM role attached?**
```bash
aws ec2 describe-instances \
  --instance-ids i-060b635518a854b74 \
  --region ap-southeast-1 \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text
# Expected: arn:aws:iam::849073006275:instance-profile/gada-vn-staging-app-profile
```

**Check 6 — Policy attached to role?**
```bash
aws iam list-attached-role-policies \
  --role-name gada-vn-staging-app-role \
  --query 'AttachedPolicies[].PolicyName' --output text
# Expected includes: AmazonSSMManagedInstanceCore
```

### "session-manager-plugin not found"
Install it — see Step 2 above. The CLI silently fails without it.

### Session disconnects immediately
Usually a permissions issue. Run:
```bash
aws ssm start-session \
  --target i-060b635518a854b74 \
  --region ap-southeast-1 \
  --debug 2>&1 | grep -i "error\|permission\|denied"
```
