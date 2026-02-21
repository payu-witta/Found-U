#!/bin/bash
# Initialize LocalStack S3 buckets for local development

echo "Creating S3 buckets..."

awslocal s3 mb s3://foundu-assets-local
awslocal s3 mb s3://foundu-quarantine-local

# Set CORS configuration
awslocal s3api put-bucket-cors \
  --bucket foundu-assets-local \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"],
      "ExposeHeaders": []
    }]
  }'

echo "LocalStack S3 buckets created successfully"
