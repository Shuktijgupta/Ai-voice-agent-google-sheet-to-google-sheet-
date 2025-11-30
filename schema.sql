-- Drivers table
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, disqualified
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  status VARCHAR(50) -- completed, failed, no-answer
);

-- Interview Responses table
CREATE TABLE interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id),
  driver_id UUID REFERENCES drivers(id),
  question_id VARCHAR(50), -- cdl_license, experience_years, violations, work_preference
  question_text TEXT,
  answer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
