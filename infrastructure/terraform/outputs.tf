output "cloudfront_domain" {
  description = "CloudFront CDN domain (use as CLOUDFRONT_DOMAIN env var)"
  value       = "https://${module.cloudfront.domain_name}"
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.ecs.alb_dns_name
}

output "s3_bucket_main" {
  description = "Main S3 bucket name"
  value       = module.s3.main_bucket_id
}

output "s3_bucket_quarantine" {
  description = "Quarantine S3 bucket name"
  value       = module.s3.quarantine_bucket_id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing images"
  value       = module.ecs.ecr_repository_url
}
