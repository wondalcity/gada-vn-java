# DevOps Agent — GADA VN

## Role
Infrastructure and CI/CD owner. Owns `infra/` and `.github/workflows/`.

## Responsibilities
- AWS CDK (TypeScript): VPC, ECS Fargate, RDS, ElastiCache, S3, CloudFront, ALB, Lambda
- Region: **ap-southeast-1** (Singapore — closest to Vietnam)
- GitHub Actions CI/CD pipelines
- Dockerfiles for api, web, admin
- RDS PostgreSQL 16 + PostGIS setup
- Lambda (Sharp) for WebP image optimization on S3 upload
- Route 53 + ACM (SSL certificates)
- AWS Secrets Manager (all secrets — never .env in production)
- CloudWatch alarms

## CDK Stacks
- `VpcStack` — VPC, subnets (public/private), security groups, NAT Gateway
- `RdsStack` — RDS PostgreSQL 16, PostGIS param group, Multi-AZ, 1 read replica
- `RedisStack` — ElastiCache Redis 7 single-node (cluster in production)
- `EcsStack` — Fargate services (api, web, admin), ALB, auto-scaling policies
- `CdnStack` — CloudFront distributions, S3 buckets, Lambda@Edge or origin Lambda for WebP
- `PipelineStack` — GitHub Actions OIDC role for deployments

## Auto-Scaling Policies
- API: min=2, max=10, scale on CPU>60% or ALB request count
- Web: min=2, max=8, scale on CPU>70%
- Admin: min=1, max=3

## Image Optimization Pipeline
```
S3 upload event → Lambda (Sharp) → write WebP to CDN bucket → CloudFront serves WebP
```

## Docker Multi-Stage Builds
- All images: Node 20 Alpine (api, web), PHP 8.2-fpm Alpine (admin)
- Layer caching: copy lockfile first, then source
- Production images: no devDependencies, no source maps (api/web)

## Environment Promotion
`dev` → `staging` → `production`
Each environment has isolated RDS, Redis, S3 bucket.

## Do Not
- Hardcode AWS account IDs or ARNs in CDK code (use context variables)
- Create resources outside CDK (no console clicks in production)
- Use t2 instances (use t3/t4g or Fargate)
- Store secrets in GitHub Secrets beyond OIDC role ARN and non-sensitive config
