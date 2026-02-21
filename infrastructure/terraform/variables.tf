variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment must be prod, staging, or dev."
  }
}

variable "app_name" {
  description = "Application name prefix for resource naming"
  type        = string
  default     = "foundu"
}

variable "backend_image" {
  description = "Docker image URI for the backend (ECR or DockerHub)"
  type        = string
}

variable "backend_cpu" {
  description = "ECS task CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "ECS task memory in MiB"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Number of ECS task instances"
  type        = number
  default     = 2
}

variable "backend_port" {
  description = "Port the backend container listens on"
  type        = number
  default     = 3001
}

variable "vpc_id" {
  description = "VPC ID for ECS tasks and load balancer"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "s3_cors_allowed_origins" {
  description = "CORS allowed origins for S3 buckets"
  type        = list(string)
  default     = ["https://foundu.app", "https://www.foundu.app"]
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe only
}

variable "backend_env_vars" {
  description = "Environment variables for the backend container (sensitive vars via Secrets Manager)"
  type        = map(string)
  default     = {}
  sensitive   = true
}
