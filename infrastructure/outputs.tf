# =============================================================================
# TERRAFORM OUTPUTS - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

# =============================================================================
# VPC OUTPUTS
# =============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnets
}

# =============================================================================
# EKS OUTPUTS
# =============================================================================

output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_name
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_version" {
  description = "EKS cluster version"
  value       = module.eks.cluster_version
}

output "eks_cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks.cluster_security_group_id
}

output "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  value       = module.eks.oidc_provider_arn
}

output "eks_cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = module.eks.cluster_certificate_authority_data
}

# =============================================================================
# RDS OUTPUTS
# =============================================================================

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "rds_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

# =============================================================================
# REDIS OUTPUTS
# =============================================================================

output "redis_cluster_id" {
  description = "Redis cluster ID"
  value       = aws_elasticache_replication_group.main.id
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

# =============================================================================
# S3 OUTPUTS
# =============================================================================

output "s3_documents_bucket_id" {
  description = "S3 documents bucket ID"
  value       = aws_s3_bucket.documents.id
}

output "s3_documents_bucket_arn" {
  description = "S3 documents bucket ARN"
  value       = aws_s3_bucket.documents.arn
}

output "s3_models_bucket_id" {
  description = "S3 models bucket ID"
  value       = aws_s3_bucket.models.id
}

output "s3_models_bucket_arn" {
  description = "S3 models bucket ARN"
  value       = aws_s3_bucket.models.arn
}

# =============================================================================
# IAM OUTPUTS
# =============================================================================

output "eks_service_account_role_arn" {
  description = "EKS service account role ARN"
  value       = aws_iam_role.eks_service_account.arn
}

output "s3_access_policy_arn" {
  description = "S3 access policy ARN"
  value       = aws_iam_policy.s3_access.arn
}

output "bedrock_access_policy_arn" {
  description = "Bedrock access policy ARN"
  value       = aws_iam_policy.bedrock_access.arn
}

# =============================================================================
# SECURITY GROUP OUTPUTS
# =============================================================================

output "eks_cluster_security_group_id_output" {
  description = "EKS cluster security group ID"
  value       = aws_security_group.eks_cluster.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis.id
}

# =============================================================================
# CONFIGURATION OUTPUTS FOR APPLICATIONS
# =============================================================================

output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${var.database_username}:${var.database_password}@${aws_db_instance.main.endpoint}/${var.database_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
  sensitive   = true
}

# =============================================================================
# ENVIRONMENT VARIABLES FOR APPLICATIONS
# =============================================================================

output "environment_variables" {
  description = "Environment variables for applications"
  value = {
    AWS_REGION                = var.aws_region
    EKS_CLUSTER_NAME         = module.eks.cluster_name
    DATABASE_URL             = "postgresql://${var.database_username}:${var.database_password}@${aws_db_instance.main.endpoint}/${var.database_name}"
    REDIS_URL                = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
    S3_DOCUMENTS_BUCKET      = aws_s3_bucket.documents.id
    S3_MODELS_BUCKET         = aws_s3_bucket.models.id
    EKS_SERVICE_ACCOUNT_ROLE = aws_iam_role.eks_service_account.arn
  }
  sensitive = true
}

# =============================================================================
# MONITORING OUTPUTS
# =============================================================================

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  value       = "/aws/eks/${module.eks.cluster_name}/cluster"
}

# =============================================================================
# COST TRACKING OUTPUTS
# =============================================================================

output "resource_tags" {
  description = "Common resource tags for cost tracking"
  value = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.owner
  }
}
