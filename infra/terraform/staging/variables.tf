variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name prefix used in resource names"
  type        = string
  default     = "gada-vn"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"
}

variable "vpc_cidr" {
  description = "CIDR block for the staging VPC"
  type        = string
  default     = "10.10.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the single public subnet"
  type        = string
  default     = "10.10.1.0/24"
}

variable "availability_zone" {
  description = "AZ to place the public subnet in"
  type        = string
  default     = "ap-southeast-1a"
}

variable "instance_type" {
  description = "EC2 instance type (t4g.small = 2 vCPU, 2 GB RAM, ARM64 Graviton2)"
  type        = string
  default     = "t4g.small"
}

variable "ami_id" {
  description = "AMI ID override. Leave empty to use the latest Amazon Linux 2023 arm64."
  type        = string
  default     = ""
}

variable "key_name" {
  description = "EC2 key pair name for SSH access. Must be pre-created in the target region."
  type        = string
  default     = ""
}

variable "allowed_ingress_cidrs" {
  description = "CIDR blocks allowed for all inbound traffic (HTTP, HTTPS, API, SSH)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "s3_uploads_bucket" {
  description = "Name of the S3 bucket for user-uploaded assets"
  type        = string
  default     = "" # Defaults to <project_name>-<environment>-uploads in locals.tf
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 20
}

variable "enable_detailed_monitoring" {
  description = "Enable CloudWatch detailed monitoring (1-min metrics, extra cost)"
  type        = bool
  default     = false
}
