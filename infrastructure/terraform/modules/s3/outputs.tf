output "main_bucket_id" {
  value = aws_s3_bucket.main.id
}

output "main_bucket_arn" {
  value = aws_s3_bucket.main.arn
}

output "main_bucket_regional_domain" {
  value = aws_s3_bucket.main.bucket_regional_domain_name
}

output "quarantine_bucket_id" {
  value = aws_s3_bucket.quarantine.id
}

output "quarantine_bucket_arn" {
  value = aws_s3_bucket.quarantine.arn
}

output "cloudfront_oac_id" {
  value = aws_cloudfront_origin_access_control.main.id
}
