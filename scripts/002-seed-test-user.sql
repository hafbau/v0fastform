-- Seed a test user for development/testing
-- Email: test@fastform.dev
-- Password: testpassword123

-- The password hash below is for 'testpassword123' generated with bcrypt (cost factor 10)
INSERT INTO users (id, email, password, created_at)
VALUES (
  gen_random_uuid(),
  'test@fastform.dev',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.aCmS6th0PZjkyLh7Zu',
  NOW()
)
ON CONFLICT (email) DO NOTHING;
