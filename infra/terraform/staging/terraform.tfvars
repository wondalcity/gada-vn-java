project_name = "gada-vn"
environment  = "staging"
aws_region   = "ap-southeast-1"

# Networking
vpc_cidr           = "10.10.0.0/16"
public_subnet_cidr = "10.10.1.0/24"
availability_zone  = "ap-southeast-1a"

# EC2
instance_type       = "t4g.small"
root_volume_size_gb = 20
key_name            = ""

# Ingress — SSH, HTTP, HTTPS, API port
allowed_ingress_cidrs = ["220.79.183.141/32"]

# AMI override (leave empty to auto-detect latest AL2023 arm64)
# ami_id = "ami-0abcdef1234567890"

# S3
# s3_uploads_bucket = "gada-vn-staging-uploads"  # defaults to this if empty

# CloudWatch detailed monitoring (extra cost, leave false for staging)
enable_detailed_monitoring = false
