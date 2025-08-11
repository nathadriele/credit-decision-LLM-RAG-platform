-- =============================================================================
-- CREDIT DECISION LLM RAG PLATFORM - DATABASE SEED DATA
-- =============================================================================

-- =============================================================================
-- SYSTEM ROLES
-- =============================================================================

INSERT INTO roles (id, name, description, is_system, is_active) VALUES
    (uuid_generate_v4(), 'SUPER_ADMIN', 'Super Administrator with full system access', true, true),
    (uuid_generate_v4(), 'ADMIN', 'Administrator with system management access', true, true),
    (uuid_generate_v4(), 'CREDIT_ANALYST', 'Credit Analyst with application review access', true, true),
    (uuid_generate_v4(), 'RISK_MANAGER', 'Risk Manager with risk assessment access', true, true),
    (uuid_generate_v4(), 'UNDERWRITER', 'Underwriter with decision-making access', true, true),
    (uuid_generate_v4(), 'CUSTOMER_SERVICE', 'Customer Service with limited access', true, true),
    (uuid_generate_v4(), 'AUDITOR', 'Auditor with read-only access to audit logs', true, true),
    (uuid_generate_v4(), 'VIEWER', 'Viewer with read-only access', true, true);

-- =============================================================================
-- SYSTEM PERMISSIONS
-- =============================================================================

INSERT INTO permissions (id, name, description, resource, action) VALUES
    -- User Management
    (uuid_generate_v4(), 'USER_CREATE', 'Create new users', 'user', 'create'),
    (uuid_generate_v4(), 'USER_READ', 'View user information', 'user', 'read'),
    (uuid_generate_v4(), 'USER_UPDATE', 'Update user information', 'user', 'update'),
    (uuid_generate_v4(), 'USER_DELETE', 'Delete users', 'user', 'delete'),
    
    -- Credit Applications
    (uuid_generate_v4(), 'APPLICATION_CREATE', 'Create credit applications', 'application', 'create'),
    (uuid_generate_v4(), 'APPLICATION_READ', 'View credit applications', 'application', 'read'),
    (uuid_generate_v4(), 'APPLICATION_UPDATE', 'Update credit applications', 'application', 'update'),
    (uuid_generate_v4(), 'APPLICATION_DELETE', 'Delete credit applications', 'application', 'delete'),
    (uuid_generate_v4(), 'APPLICATION_APPROVE', 'Approve credit applications', 'application', 'approve'),
    (uuid_generate_v4(), 'APPLICATION_REJECT', 'Reject credit applications', 'application', 'reject'),
    
    -- Risk Assessment
    (uuid_generate_v4(), 'RISK_ASSESSMENT_READ', 'View risk assessments', 'risk_assessment', 'read'),
    (uuid_generate_v4(), 'RISK_ASSESSMENT_CREATE', 'Create risk assessments', 'risk_assessment', 'create'),
    (uuid_generate_v4(), 'RISK_ASSESSMENT_UPDATE', 'Update risk assessments', 'risk_assessment', 'update'),
    
    -- AI/LLM
    (uuid_generate_v4(), 'LLM_QUERY', 'Query LLM services', 'llm', 'query'),
    (uuid_generate_v4(), 'LLM_ADMIN', 'Administer LLM services', 'llm', 'admin'),
    (uuid_generate_v4(), 'PROMPT_MANAGE', 'Manage prompts', 'prompt', 'manage'),
    (uuid_generate_v4(), 'RAG_MANAGE', 'Manage RAG pipeline', 'rag', 'manage'),
    
    -- System
    (uuid_generate_v4(), 'SYSTEM_CONFIG', 'Configure system settings', 'system', 'config'),
    (uuid_generate_v4(), 'AUDIT_LOG_READ', 'View audit logs', 'audit_log', 'read'),
    (uuid_generate_v4(), 'MONITORING_READ', 'View monitoring data', 'monitoring', 'read');

-- =============================================================================
-- ROLE-PERMISSION ASSIGNMENTS
-- =============================================================================

-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN';

-- Admin gets most permissions except super admin specific ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
AND p.name NOT IN ('USER_DELETE', 'SYSTEM_CONFIG');

-- Credit Analyst permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CREDIT_ANALYST'
AND p.name IN (
    'APPLICATION_READ', 'APPLICATION_UPDATE', 'APPLICATION_CREATE',
    'RISK_ASSESSMENT_READ', 'RISK_ASSESSMENT_CREATE',
    'LLM_QUERY', 'USER_READ'
);

-- Risk Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'RISK_MANAGER'
AND p.name IN (
    'APPLICATION_READ', 'RISK_ASSESSMENT_READ', 'RISK_ASSESSMENT_CREATE',
    'RISK_ASSESSMENT_UPDATE', 'LLM_QUERY', 'MONITORING_READ'
);

-- Underwriter permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'UNDERWRITER'
AND p.name IN (
    'APPLICATION_READ', 'APPLICATION_UPDATE', 'APPLICATION_APPROVE',
    'APPLICATION_REJECT', 'RISK_ASSESSMENT_READ', 'LLM_QUERY'
);

-- Customer Service permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CUSTOMER_SERVICE'
AND p.name IN (
    'APPLICATION_READ', 'APPLICATION_UPDATE', 'USER_READ'
);

-- Auditor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'AUDITOR'
AND p.name IN (
    'APPLICATION_READ', 'RISK_ASSESSMENT_READ', 'AUDIT_LOG_READ',
    'USER_READ', 'MONITORING_READ'
);

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'VIEWER'
AND p.name IN (
    'APPLICATION_READ', 'RISK_ASSESSMENT_READ', 'USER_READ'
);

-- =============================================================================
-- DEFAULT ADMIN USER
-- =============================================================================

-- Create default admin user (password: admin123 - change in production!)
INSERT INTO users (id, email, username, first_name, last_name, password_hash, is_active, is_email_verified)
VALUES (
    uuid_generate_v4(),
    'admin@creditdecision.com',
    'admin',
    'System',
    'Administrator',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', -- admin123
    true,
    true
);

-- Assign admin role to default user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'admin'
AND r.name = 'SUPER_ADMIN';

-- =============================================================================
-- SAMPLE CREDIT APPLICATION DATA
-- =============================================================================

-- Sample credit application
INSERT INTO credit_applications (
    id,
    applicant_id,
    application_number,
    status,
    requested_amount,
    currency,
    purpose,
    term_months,
    applicant_data
) VALUES (
    uuid_generate_v4(),
    uuid_generate_v4(),
    'APP-2024-001',
    'SUBMITTED',
    50000.00,
    'USD',
    'BUSINESS',
    36,
    '{
        "personal": {
            "firstName": "John",
            "lastName": "Doe",
            "dateOfBirth": "1985-06-15",
            "ssn": "123-45-6789",
            "email": "john.doe@example.com",
            "phone": "+1-555-0123",
            "address": {
                "street": "123 Main St",
                "city": "New York",
                "state": "NY",
                "zipCode": "10001",
                "country": "USA",
                "residenceType": "OWN",
                "monthsAtAddress": 60
            },
            "maritalStatus": "MARRIED",
            "dependents": 2,
            "citizenship": "USA"
        },
        "financial": {
            "annualIncome": 120000,
            "monthlyIncome": 10000,
            "monthlyExpenses": 6000,
            "creditScore": 750,
            "debtToIncomeRatio": 0.3
        },
        "employment": {
            "employerName": "Tech Solutions Inc",
            "jobTitle": "Senior Software Engineer",
            "employmentType": "FULL_TIME",
            "monthsEmployed": 48
        }
    }'
);

-- =============================================================================
-- SAMPLE DOCUMENTS
-- =============================================================================

-- Sample document for the application
INSERT INTO documents (
    id,
    application_id,
    type,
    name,
    description,
    file_url,
    file_size,
    mime_type,
    status,
    uploaded_by
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM credit_applications WHERE application_number = 'APP-2024-001'),
    'INCOME_VERIFICATION',
    'pay_stub_2024_01.pdf',
    'Pay stub for January 2024',
    's3://credit-decision-documents/pay_stub_2024_01.pdf',
    245760,
    'application/pdf',
    'VERIFIED',
    (SELECT id FROM users WHERE username = 'admin')
);

-- =============================================================================
-- SAMPLE RISK ASSESSMENT
-- =============================================================================

-- Sample risk assessment
INSERT INTO risk_assessments (
    id,
    application_id,
    overall_risk_score,
    risk_grade,
    probability_of_default,
    expected_loss,
    risk_factors,
    risk_mitigants,
    model_outputs
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM credit_applications WHERE application_number = 'APP-2024-001'),
    72.5,
    'A',
    0.0250,
    0.0125,
    '[
        {
            "category": "CREDIT_HISTORY",
            "factor": "High credit score",
            "impact": 15.0,
            "weight": 0.3,
            "description": "Credit score of 750 indicates good payment history"
        },
        {
            "category": "INCOME_STABILITY",
            "factor": "Stable employment",
            "impact": 12.0,
            "weight": 0.25,
            "description": "4 years with current employer shows stability"
        }
    ]',
    '{"Stable employment history", "High credit score", "Low debt-to-income ratio"}',
    '{
        "creditScoreModel": {
            "score": 750,
            "features": {
                "paymentHistory": 0.95,
                "creditUtilization": 0.25,
                "lengthOfHistory": 0.85
            }
        },
        "incomeStabilityModel": {
            "score": 0.88,
            "features": {
                "employmentLength": 48,
                "incomeVariability": 0.05
            }
        }
    }'
);

-- =============================================================================
-- SAMPLE CREDIT DECISION
-- =============================================================================

-- Sample credit decision
INSERT INTO credit_decisions (
    id,
    application_id,
    decision,
    approved_amount,
    interest_rate,
    term_months,
    conditions,
    reasons,
    confidence,
    ai_recommendation
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM credit_applications WHERE application_number = 'APP-2024-001'),
    'APPROVED',
    45000.00,
    0.0675,
    36,
    '{"Provide quarterly financial statements", "Maintain minimum credit score of 700"}',
    '{"Strong credit history", "Stable income", "Low risk profile", "Adequate collateral"}',
    0.87,
    '{
        "decision": "APPROVED",
        "confidence": 0.87,
        "reasoning": [
            "Applicant has excellent credit score of 750",
            "Stable employment for 4 years",
            "Low debt-to-income ratio of 30%",
            "Sufficient income to support loan payments"
        ],
        "riskFactors": [
            "Requested amount is significant relative to annual income"
        ],
        "mitigatingFactors": [
            "Strong credit history",
            "Stable employment",
            "Low existing debt burden"
        ],
        "modelVersion": "v1.2.3",
        "processingTime": 2.5
    }'
);

-- =============================================================================
-- AUDIT LOG SAMPLE
-- =============================================================================

-- Sample audit log entry
INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    changes,
    user_id,
    metadata
) VALUES (
    'credit_application',
    (SELECT id FROM credit_applications WHERE application_number = 'APP-2024-001'),
    'STATUS_CHANGE',
    '{
        "status": {
            "old": "DRAFT",
            "new": "SUBMITTED"
        }
    }',
    (SELECT id FROM users WHERE username = 'admin'),
    '{
        "source": "web_application",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }'
);
