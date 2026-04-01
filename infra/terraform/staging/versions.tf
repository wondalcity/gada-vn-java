terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state for now — migrate to S3 backend once wonyuep IAM has s3:ListBucket
  # backend "s3" {
  #   bucket         = "gada-vn-tf-state"
  #   key            = "staging/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "gada-vn-tf-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "gada-vn"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}
