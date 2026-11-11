// Creates (or promotes) an admin account for the dashboard.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs email password
// Local dev: values come from `npx supabase status -o env` (API_URL, SERVICE_ROLE_KEY).
import { createClient } from '@supabase/supabase-js';

const [email, password] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !url || !key) {
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs <email> <password>');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

let userId;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) {
  // Already registered: look the user up and reset the password.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw created.error;
  userId = existing.id;
  const upd = await admin.auth.admin.updateUserById(userId, { password });
  if (upd.error) throw upd.error;
} else {
  userId = created.data.user.id;
}

const { error } = await admin.from('admin_users').upsert({ user_id: userId, display_name: email });
if (error) throw error;
console.log(`Admin ready: ${email}`);
