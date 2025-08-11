-- =============================================================================
-- CREDIT TABLES MIGRATION - CREDIT DECISION LLM RAG PLATFORM
-- =============================================================================

-- Create credit applications table
CREATE TABLE IF NOT EXISTS credit_applications (
    id VARCHAR(255) PRIMARY KEY,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    applicant_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    requested_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    purpose VARCHAR(50) NOT NULL,
    term_months INTEGER NOT NULL,
    applicant_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_credit_applications_applicant 
        FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_credit_applications_status 
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS', 
                         'RISK_ASSESSMENT', 'DECISION_PENDING', 'APPROVED', 'DECLINED', 
                         'WITHDRAWN', 'EXPIRED')),
    CONSTRAINT chk_credit_applications_purpose 
        CHECK (purpose IN ('PERSONAL', 'BUSINESS', 'AUTO', 'HOME', 'EDUCATION', 
                          'DEBT_CONSOLIDATION', 'OTHER')),
    CONSTRAINT chk_credit_applications_amount 
        CHECK (requested_amount > 0),
    CONSTRAINT chk_credit_applications_term 
        CHECK (term_months > 0)
);

-- Create risk assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,
    overall_risk_score DECIMAL(5,2) NOT NULL,
    risk_grade VARCHAR(10) NOT NULL,
    probability_of_default DECIMAL(5,4) NOT NULL,
    expected_loss DECIMAL(5,4) NOT NULL,
    risk_factors JSONB NOT NULL DEFAULT '[]',
    risk_mitigants JSONB NOT NULL DEFAULT '[]',
    model_outputs JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    ai_insights JSONB NOT NULL DEFAULT '[]',
    processing_time INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_risk_assessments_application 
        FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE CASCADE,
    CONSTRAINT chk_risk_assessments_score 
        CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    CONSTRAINT chk_risk_assessments_grade 
        CHECK (risk_grade IN ('AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC')),
    CONSTRAINT chk_risk_assessments_pod 
        CHECK (probability_of_default >= 0 AND probability_of_default <= 1),
    CONSTRAINT chk_risk_assessments_el 
        CHECK (expected_loss >= 0 AND expected_loss <= 1)
);

-- Create credit decisions table
CREATE TABLE IF NOT EXISTS credit_decisions (
    id VARCHAR(255) PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    approved_amount DECIMAL(15,2),
    interest_rate DECIMAL(8,6),
    term_months INTEGER,
    conditions JSONB NOT NULL DEFAULT '[]',
    reasons JSONB NOT NULL DEFAULT '[]',
    confidence DECIMAL(5,4) NOT NULL DEFAULT 0.5,
    ai_recommendation JSONB NOT NULL DEFAULT '{}',
    risk_assessment_id VARCHAR(255) NOT NULL,
    decided_by VARCHAR(255) NOT NULL,
    decided_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_credit_decisions_application 
        FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_decisions_risk_assessment 
        FOREIGN KEY (risk_assessment_id) REFERENCES risk_assessments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_credit_decisions_decided_by 
        FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_credit_decisions_decision 
        CHECK (decision IN ('APPROVED', 'DECLINED', 'CONDITIONAL_APPROVAL', 
                           'COUNTER_OFFER', 'PENDING_REVIEW')),
    CONSTRAINT chk_credit_decisions_amount 
        CHECK (approved_amount IS NULL OR approved_amount > 0),
    CONSTRAINT chk_credit_decisions_rate 
        CHECK (interest_rate IS NULL OR (interest_rate >= 0 AND interest_rate <= 1)),
    CONSTRAINT chk_credit_decisions_term 
        CHECK (term_months IS NULL OR term_months > 0),
    CONSTRAINT chk_credit_decisions_confidence 
        CHECK (confidence >= 0 AND confidence <= 1)
);

-- Create decision reviews table
CREATE TABLE IF NOT EXISTS decision_reviews (
    id SERIAL PRIMARY KEY,
    decision_id VARCHAR(255) NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_decision_reviews_decision 
        FOREIGN KEY (decision_id) REFERENCES credit_decisions(id) ON DELETE CASCADE,
    CONSTRAINT fk_decision_reviews_reviewer 
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_decision_reviews_action 
        CHECK (action IN ('APPROVE', 'MODIFY', 'REJECT'))
);

-- Create application documents table
CREATE TABLE IF NOT EXISTS application_documents (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_application_documents_application 
        FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_documents_uploaded_by 
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_application_documents_verified_by 
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_application_documents_type 
        CHECK (document_type IN ('INCOME_VERIFICATION', 'BANK_STATEMENT', 'TAX_RETURN', 
                                'EMPLOYMENT_LETTER', 'CREDIT_REPORT', 'COLLATERAL_APPRAISAL', 
                                'IDENTITY_DOCUMENT', 'OTHER')),
    CONSTRAINT chk_application_documents_size 
        CHECK (file_size > 0)
);

-- Create application notes table
CREATE TABLE IF NOT EXISTS application_notes (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,
    note_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    content TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_application_notes_application 
        FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_notes_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_application_notes_type 
        CHECK (note_type IN ('GENERAL', 'RISK', 'COMPLIANCE', 'VERIFICATION', 'DECISION'))
);

-- Create application status history table
CREATE TABLE IF NOT EXISTS application_status_history (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_application_status_history_application 
        FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_application_status_history_changed_by 
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Credit applications indexes
CREATE INDEX IF NOT EXISTS idx_credit_applications_applicant_id 
    ON credit_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_status 
    ON credit_applications(status);
CREATE INDEX IF NOT EXISTS idx_credit_applications_created_at 
    ON credit_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_applications_application_number 
    ON credit_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_credit_applications_purpose 
    ON credit_applications(purpose);

-- Risk assessments indexes
CREATE INDEX IF NOT EXISTS idx_risk_assessments_application_id 
    ON risk_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_score 
    ON risk_assessments(overall_risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_grade 
    ON risk_assessments(risk_grade);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at 
    ON risk_assessments(created_at DESC);

-- Credit decisions indexes
CREATE INDEX IF NOT EXISTS idx_credit_decisions_application_id 
    ON credit_decisions(application_id);
CREATE INDEX IF NOT EXISTS idx_credit_decisions_decision 
    ON credit_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_credit_decisions_decided_by 
    ON credit_decisions(decided_by);
CREATE INDEX IF NOT EXISTS idx_credit_decisions_decided_at 
    ON credit_decisions(decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_decisions_expires_at 
    ON credit_decisions(expires_at);

-- Decision reviews indexes
CREATE INDEX IF NOT EXISTS idx_decision_reviews_decision_id 
    ON decision_reviews(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_reviews_reviewer_id 
    ON decision_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_decision_reviews_created_at 
    ON decision_reviews(created_at DESC);

-- Application documents indexes
CREATE INDEX IF NOT EXISTS idx_application_documents_application_id 
    ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_type 
    ON application_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_application_documents_uploaded_by 
    ON application_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_application_documents_verified 
    ON application_documents(verified);

-- Application notes indexes
CREATE INDEX IF NOT EXISTS idx_application_notes_application_id 
    ON application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_application_notes_type 
    ON application_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_application_notes_created_by 
    ON application_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_application_notes_created_at 
    ON application_notes(created_at DESC);

-- Application status history indexes
CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id 
    ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at 
    ON application_status_history(changed_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_credit_applications_updated_at 
    BEFORE UPDATE ON credit_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_assessments_updated_at 
    BEFORE UPDATE ON risk_assessments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_decisions_updated_at 
    BEFORE UPDATE ON credit_decisions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_notes_updated_at 
    BEFORE UPDATE ON application_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO application_status_history (
            application_id, 
            previous_status, 
            new_status, 
            changed_by, 
            reason
        ) VALUES (
            NEW.id, 
            OLD.status, 
            NEW.status, 
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            'Status changed via application update'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for status change logging
CREATE TRIGGER log_credit_application_status_change 
    AFTER UPDATE ON credit_applications 
    FOR EACH ROW EXECUTE FUNCTION log_application_status_change();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Application summary view
CREATE OR REPLACE VIEW application_summary AS
SELECT 
    ca.id,
    ca.application_number,
    ca.status,
    ca.requested_amount,
    ca.currency,
    ca.purpose,
    ca.term_months,
    ca.created_at,
    ca.updated_at,
    u.email as applicant_email,
    u.first_name as applicant_first_name,
    u.last_name as applicant_last_name,
    ra.overall_risk_score,
    ra.risk_grade,
    cd.decision,
    cd.approved_amount,
    cd.interest_rate,
    cd.decided_at
FROM credit_applications ca
LEFT JOIN users u ON ca.applicant_id = u.id
LEFT JOIN risk_assessments ra ON ca.id = ra.application_id
LEFT JOIN credit_decisions cd ON ca.id = cd.application_id;

-- Risk assessment summary view
CREATE OR REPLACE VIEW risk_assessment_summary AS
SELECT 
    ra.id,
    ra.application_id,
    ca.application_number,
    ra.overall_risk_score,
    ra.risk_grade,
    ra.probability_of_default,
    ra.expected_loss,
    jsonb_array_length(ra.risk_factors) as risk_factor_count,
    jsonb_array_length(ra.risk_mitigants) as risk_mitigant_count,
    ra.processing_time,
    ra.created_at
FROM risk_assessments ra
JOIN credit_applications ca ON ra.application_id = ca.id;

-- Decision summary view
CREATE OR REPLACE VIEW decision_summary AS
SELECT 
    cd.id,
    cd.application_id,
    ca.application_number,
    cd.decision,
    cd.approved_amount,
    cd.interest_rate,
    cd.term_months,
    cd.confidence,
    cd.decided_at,
    cd.expires_at,
    u.email as decided_by_email,
    u.first_name as decided_by_first_name,
    u.last_name as decided_by_last_name
FROM credit_decisions cd
JOIN credit_applications ca ON cd.application_id = ca.id
JOIN users u ON cd.decided_by = u.id;

-- =============================================================================
-- SAMPLE DATA (for development)
-- =============================================================================

-- Insert sample decision criteria (this would typically be configuration)
INSERT INTO system_config (key, value, description) VALUES 
('credit.min_credit_score', '650', 'Minimum credit score for loan approval'),
('credit.max_debt_to_income_ratio', '0.4', 'Maximum debt-to-income ratio'),
('credit.min_employment_months', '12', 'Minimum employment months required'),
('credit.auto_approval_risk_threshold', '35', 'Risk score threshold for auto approval'),
('credit.auto_decline_risk_threshold', '75', 'Risk score threshold for auto decline'),
('credit.base_interest_rate', '0.05', 'Base interest rate for loans')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
