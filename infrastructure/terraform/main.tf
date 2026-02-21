# FoundU — AWS Infrastructure
# Provisions: S3 (assets + quarantine), CloudFront CDN, ECS Fargate (backend API)

locals {
  name_prefix = "${var.app_name}-${var.environment}"
}

# ── S3 Module ─────────────────────────────────────────────────────────────────
module "s3" {
  source = "./modules/s3"

  name_prefix            = local.name_prefix
  cors_allowed_origins   = var.s3_cors_allowed_origins
}

# ── CloudFront Module ─────────────────────────────────────────────────────────
module "cloudfront" {
  source = "./modules/cloudfront"

  name_prefix         = local.name_prefix
  s3_bucket_id        = module.s3.main_bucket_id
  s3_bucket_domain    = module.s3.main_bucket_regional_domain
  price_class         = var.cloudfront_price_class
  certificate_arn     = var.certificate_arn
}

# ── ECS Module ────────────────────────────────────────────────────────────────
module "ecs" {
  source = "./modules/ecs"

  name_prefix        = local.name_prefix
  app_name           = var.app_name
  environment        = var.environment
  backend_image      = var.backend_image
  backend_port       = var.backend_port
  cpu                = var.backend_cpu
  memory             = var.backend_memory
  desired_count      = var.backend_desired_count
  vpc_id             = var.vpc_id
  public_subnet_ids  = var.public_subnet_ids
  private_subnet_ids = var.private_subnet_ids
  certificate_arn    = var.certificate_arn
  env_vars           = var.backend_env_vars
  cloudfront_domain  = module.cloudfront.domain_name
  s3_bucket_main     = module.s3.main_bucket_id
  s3_bucket_quar     = module.s3.quarantine_bucket_id
}
