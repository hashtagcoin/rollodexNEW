-- Create housing group applications table
CREATE TABLE IF NOT EXISTS housing_group_applications (
  id BIGSERIAL PRIMARY KEY,
  housing_group_id UUID NOT NULL REFERENCES housing_groups(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id),
  applicant_message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'left'
  admin_comment TEXT,
  admin_id UUID REFERENCES profiles(id), -- admin who processed the application
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (housing_group_id, applicant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_housing_group_applications_housing_group_id 
  ON housing_group_applications(housing_group_id);
CREATE INDEX IF NOT EXISTS idx_housing_group_applications_applicant_id 
  ON housing_group_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_housing_group_applications_status 
  ON housing_group_applications(status);

-- Create view for applications with user details
CREATE OR REPLACE VIEW housing_group_applications_with_details AS
SELECT 
  a.*,
  p.full_name AS applicant_name,
  p.avatar_url AS applicant_avatar,
  p.bio AS applicant_bio,
  date_part('year', age(p.date_of_birth)) AS applicant_age,
  ap.full_name AS admin_name,
  ap.avatar_url AS admin_avatar
FROM 
  housing_group_applications a
  JOIN profiles p ON a.applicant_id = p.id
  LEFT JOIN profiles ap ON a.admin_id = ap.id;
