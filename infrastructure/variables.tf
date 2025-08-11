# =============================================================================
# TERRAFORM VARIABLES - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

# =============================================================================
# GENERAL VARIABLES
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "credit-decision-llm-rag"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "platform-team"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# NETWORKING VARIABLES
# =============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# =============================================================================
# EKS VARIABLES
# =============================================================================

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS node groups"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "eks_node_group_min_size" {
  description = "Minimum size of the EKS node group"
  type        = number
  default     = 1
}

variable "eks_node_group_max_size" {
  description = "Maximum size of the EKS node group"
  type        = number
  default     = 10
}

variable "eks_node_group_desired_size" {
  description = "Desired size of the EKS node group"
  type        = number
  default     = 3
}

# =============================================================================
# EKS ADDON VERSIONS
# =============================================================================

variable "coredns_version" {
  description = "CoreDNS addon version"
  type        = string
  default     = "v1.10.1-eksbuild.5"
}

variable "kube_proxy_version" {
  description = "Kube-proxy addon version"
  type        = string
  default     = "v1.28.2-eksbuild.2"
}

variable "vpc_cni_version" {
  description = "VPC CNI addon version"
  type        = string
  default     = "v1.15.1-eksbuild.1"
}

variable "ebs_csi_version" {
  description = "EBS CSI driver addon version"
  type        = string
  default     = "v1.24.0-eksbuild.1"
}

# =============================================================================
# RDS VARIABLES
# =============================================================================

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "credit_decision_db"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  default     = "change-me-in-production"
}

# =============================================================================
# REDIS VARIABLES
# =============================================================================

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 1
}

# =============================================================================
# MONITORING VARIABLES
# =============================================================================

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch logs"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing"
  type        = bool
  default     = true
}

# =============================================================================
# SECURITY VARIABLES
# =============================================================================

variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest for all services"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit for all services"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cluster"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# =============================================================================
# COST OPTIMIZATION VARIABLES
# =============================================================================

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "enable_auto_scaling" {
  description = "Enable auto scaling for EKS node groups"
  type        = bool
  default     = true
}

# =============================================================================
# FEATURE FLAGS
# =============================================================================

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for AI workloads"
  type        = bool
  default     = false
}

variable "enable_bedrock" {
  description = "Enable AWS Bedrock integration"
  type        = bool
  default     = true
}

variable "enable_opensearch" {
  description = "Enable OpenSearch for logging and search"
  type        = bool
  default     = false
}

variable "enable_lambda_functions" {
  description = "Enable Lambda functions for serverless processing"
  type        = bool
  default     = true
}
