-- AMEP (Adaptive Mastery Platform) Database Schema
-- Core tables for the EdTech platform

-- ==================== USERS & AUTHENTICATION ====================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    profile_picture_url VARCHAR(500),
    bio TEXT,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP
);

-- ==================== STUDENTS ====================
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    enrollment_date DATE NOT NULL,
    graduation_date DATE,
    gpa DECIMAL(3, 2),
    major VARCHAR(100),
    minor VARCHAR(100),
    advisor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (advisor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==================== TEACHERS ====================
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    specialization VARCHAR(100),
    hire_date DATE NOT NULL,
    office_location VARCHAR(100),
    office_hours TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== ADMIN ====================
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    permissions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== COURSES & CLASSES ====================
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    credit_hours INT,
    semester VARCHAR(50),
    academic_year VARCHAR(9),
    teacher_id INT NOT NULL,
    max_students INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed', 'inactive')),
    UNIQUE (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== LECTURES & ATTENDANCE ====================
CREATE TABLE lectures (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    lecture_title VARCHAR(255) NOT NULL,
    lecture_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_location VARCHAR(100),
    recording_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    lecture_id INT NOT NULL,
    student_id INT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    check_in_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lecture_id, student_id),
    FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== ASSIGNMENTS & SUBMISSIONS ====================
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    assignment_title VARCHAR(255) NOT NULL,
    description TEXT,
    assignment_type VARCHAR(50) CHECK (assignment_type IN ('homework', 'quiz', 'project', 'exam')),
    due_date TIMESTAMP NOT NULL,
    total_points DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submission_url VARCHAR(500),
    submission_text TEXT,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'resubmitted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== GRADES ====================
CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    assignment_submission_id INT NOT NULL UNIQUE,
    points_earned DECIMAL(5, 2),
    percentage DECIMAL(5, 2),
    grade_letter VARCHAR(2),
    feedback TEXT,
    graded_by INT,
    graded_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE course_grades (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    final_score DECIMAL(5, 2),
    grade_letter VARCHAR(2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== PROJECTS & PROJECT LAB ====================
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    project_title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    project_type VARCHAR(100),
    max_team_size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE project_teams (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    team_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE project_team_members (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL,
    student_id INT NOT NULL,
    role VARCHAR(100),
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (team_id, student_id),
    FOREIGN KEY (team_id) REFERENCES project_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE project_submissions (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    team_id INT NOT NULL,
    submission_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submission_url VARCHAR(500),
    description TEXT,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES project_teams(id) ON DELETE CASCADE
);

-- ==================== PRACTICE ARENA ====================
CREATE TABLE practice_exercises (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    exercise_title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(50) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    category VARCHAR(100),
    content TEXT,
    solution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE practice_attempts (
    id SERIAL PRIMARY KEY,
    exercise_id INT NOT NULL,
    student_id INT NOT NULL,
    attempt_number INT DEFAULT 1,
    answer TEXT,
    is_correct BOOLEAN,
    score DECIMAL(5, 2),
    time_spent_minutes INT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exercise_id) REFERENCES practice_exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== EVENTS & EVENT HUB ====================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    event_type VARCHAR(100) CHECK (event_type IN ('lecture', 'workshop', 'seminar', 'social', 'career', 'other')),
    organizer_id INT,
    max_attendees INT,
    registration_deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    student_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
    UNIQUE (event_id, student_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== CALENDAR & SCHEDULING ====================
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_title VARCHAR(255) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    location VARCHAR(255),
    event_color VARCHAR(20),
    is_all_day BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== TASKS & PLANNER ====================
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    due_time TIME,
    priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    category VARCHAR(100),
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE task_reminders (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL,
    reminder_time TIMESTAMP,
    reminder_type VARCHAR(50) CHECK (reminder_type IN ('email', 'in_app', 'push')),
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ==================== WELLNESS & WELLNESS WING ====================
CREATE TABLE wellness_activities (
    id SERIAL PRIMARY KEY,
    activity_title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100) CHECK (activity_type IN ('meditation', 'exercise', 'mindfulness', 'counseling', 'workshop', 'other')),
    duration_minutes INT,
    instructor_id INT,
    schedule_date DATE,
    schedule_time TIME,
    location VARCHAR(255),
    max_participants INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wellness_registrations (
    id SERIAL PRIMARY KEY,
    activity_id INT NOT NULL,
    student_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
    UNIQUE (activity_id, student_id),
    FOREIGN KEY (activity_id) REFERENCES wellness_activities(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== CAREER CELL ====================
CREATE TABLE job_postings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    salary_range VARCHAR(100),
    job_type VARCHAR(50) CHECK (job_type IN ('full_time', 'part_time', 'internship', 'contract')),
    location VARCHAR(255),
    application_deadline DATE,
    posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    job_posting_id INT NOT NULL,
    student_id INT NOT NULL,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resume_url VARCHAR(500),
    cover_letter TEXT,
    status VARCHAR(50) DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interview', 'rejected', 'accepted')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (job_posting_id, student_id),
    FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ==================== LEARNING ANALYTICS & AI ENGAGEMENT ====================
CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT,
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP,
    duration_minutes INT,
    activity_type VARCHAR(100),
    engagement_level VARCHAR(50) CHECK (engagement_level IN ('low', 'medium', 'high')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

CREATE TABLE engagement_metrics (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    metric_date DATE NOT NULL,
    lectures_attended INT,
    assignments_completed INT,
    practice_exercises_done INT,
    total_study_hours DECIMAL(5, 2),
    average_assignment_score DECIMAL(5, 2),
    course_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, metric_date, course_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- ==================== AI & VISION-BASED ENGAGEMENT TRACKING ====================
CREATE TABLE video_sessions (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    lecture_id INT,
    recording_url VARCHAR(500),
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP,
    total_duration_seconds INT,
    engagement_data TEXT,
    facial_expressions_detected INT,
    attention_level DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE SET NULL
);

CREATE TABLE engagement_frames (
    id SERIAL PRIMARY KEY,
    video_session_id INT NOT NULL,
    frame_timestamp INT,
    attention_score DECIMAL(3, 2),
    engagement_score DECIMAL(3, 2),
    detected_emotions VARCHAR(50),
    head_pose VARCHAR(50),
    eye_gaze_direction VARCHAR(50),
    FOREIGN KEY (video_session_id) REFERENCES video_sessions(id) ON DELETE CASCADE
);

-- ==================== REPORTS ====================
CREATE TABLE performance_reports (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    report_date DATE NOT NULL,
    course_id INT,
    gpa_overall DECIMAL(3, 2),
    attendance_percentage DECIMAL(5, 2),
    assignment_completion_rate DECIMAL(5, 2),
    average_score DECIMAL(5, 2),
    strengths TEXT,
    areas_for_improvement TEXT,
    teacher_comments TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES teachers(id) ON DELETE SET NULL
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    notification_type VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== AUDIT LOG ====================
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INT,
    changes_made TEXT,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ==================== INDEXES ====================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_lecture ON attendance(lecture_id);
CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_grades_student ON grades(graded_by);
CREATE INDEX idx_course_grades_student ON course_grades(student_id);
CREATE INDEX idx_course_grades_course ON course_grades(course_id);
CREATE INDEX idx_projects_course ON projects(course_id);
CREATE INDEX idx_event_registrations_student ON event_registrations(student_id);
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_wellness_registrations_student ON wellness_registrations(student_id);
CREATE INDEX idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX idx_video_sessions_student ON video_sessions(student_id);
CREATE INDEX idx_performance_reports_student ON performance_reports(student_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);