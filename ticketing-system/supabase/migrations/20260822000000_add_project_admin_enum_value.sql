-- Step 1: Add 'project_admin' value to user_role enum
alter type user_role add value if not exists 'project_admin';
