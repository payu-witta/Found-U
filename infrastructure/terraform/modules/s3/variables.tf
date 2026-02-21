variable "name_prefix" {
  type = string
}

variable "cors_allowed_origins" {
  type    = list(string)
  default = []
}

variable "cloudfront_distribution_arn" {
  type    = string
  default = ""
}
