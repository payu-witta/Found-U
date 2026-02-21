variable "name_prefix" { type = string }
variable "s3_bucket_id" { type = string }
variable "s3_bucket_domain" { type = string }
variable "oac_id" { type = string; default = "" }
variable "price_class" { type = string; default = "PriceClass_100" }
variable "certificate_arn" { type = string; default = "" }
