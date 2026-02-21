variable "name_prefix" { type = string }
variable "app_name" { type = string }
variable "environment" { type = string }
variable "backend_image" { type = string }
variable "backend_port" { type = number; default = 3001 }
variable "cpu" { type = number; default = 512 }
variable "memory" { type = number; default = 1024 }
variable "desired_count" { type = number; default = 2 }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "certificate_arn" { type = string; default = "" }
variable "env_vars" { type = map(string); default = {}; sensitive = true }
variable "cloudfront_domain" { type = string }
variable "s3_bucket_main" { type = string }
variable "s3_bucket_quar" { type = string }
