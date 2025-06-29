/*
  # Fix Activities RLS Policy

  1. Policy Changes
    - Update the activities insert policy to allow admins and agents to create activities for any user
    - Keep the existing policy for users to create their own activities
    - Ensure proper role-based access control

  2. Security
    - Maintain RLS on activities table
    - Allow staff (admin/agent) to create activities for system actions
    - Users can still create activities for themselves
*/

-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "activities_user_create_2025" ON activities;

-- Create a new policy that allows:
-- 1. Users to create activities for themselves
-- 2. Admins and agents to create activities for any user (for system actions)
CREATE POLICY "activities_insert_policy_2025"
  ON activities
  FOR INSERT
  TO public
  WITH CHECK (
    -- Users can create activities for themselves
    (auth.uid() = user_id) OR
    -- Admins and agents can create activities for any user
    (get_current_user_role() = ANY (ARRAY['admin'::text, 'agent'::text]))
  );