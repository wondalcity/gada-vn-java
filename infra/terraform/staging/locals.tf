locals {
  name_prefix = "${var.project_name}-${var.environment}"

  uploads_bucket = var.s3_uploads_bucket != "" ? var.s3_uploads_bucket : "${local.name_prefix}-uploads"

  # Use variable override or fall back to data source (requires ec2:DescribeImages permission)
  ami_id = var.ami_id != "" ? var.ami_id : data.aws_ami.al2023.id

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Latest Amazon Linux 2023 arm64 AMI (for t4g Graviton2 instances)
# Requires ec2:DescribeImages IAM permission.
# If wonyuep IAM lacks this, set ami_id variable to a known AMI ID and this data source is bypassed.
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}
