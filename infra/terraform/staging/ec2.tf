resource "aws_instance" "app" {
  ami                    = local.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name
  key_name               = var.key_name != "" ? var.key_name : null

  # IMDSv2 — enforce hop limit 1 (blocks SSRF from containers reaching metadata)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    encrypted             = true
    delete_on_termination = true

    tags = merge(local.common_tags, { Name = "${local.name_prefix}-root" })
  }

  monitoring = var.enable_detailed_monitoring

  user_data = base64encode(file("${path.module}/scripts/user_data.sh"))

  lifecycle {
    # Prevent accidental termination; change to false when tearing down
    prevent_destroy = false

    # Ignore AMI changes after initial launch (update via new launch + replace)
    ignore_changes = [ami, user_data]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-app" })
}
