output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Elastic IP — stable public IP for the staging server"
  value       = aws_eip.instance.public_ip
}

output "public_dns" {
  description = "EC2 public DNS (changes with EIP reassociation)"
  value       = aws_eip.instance.public_dns
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "App server security group ID"
  value       = aws_security_group.app.id
}

output "iam_role_arn" {
  description = "IAM role ARN attached to the instance"
  value       = aws_iam_role.app.arn
}

output "uploads_bucket" {
  description = "S3 uploads bucket name"
  value       = aws_s3_bucket.uploads.bucket
}

output "secret_arns" {
  description = "Secrets Manager ARNs (set values manually after apply)"
  value       = { for k, v in aws_secretsmanager_secret.app : k => v.arn }
}

output "ssh_command" {
  description = "SSH command to connect (requires key_name variable to be set)"
  value       = var.key_name != "" ? "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.instance.public_ip}" : "No key pair configured"
}

output "api_url" {
  description = "Direct API URL (NestJS on port 3000)"
  value       = "http://${aws_eip.instance.public_ip}:3000"
}
