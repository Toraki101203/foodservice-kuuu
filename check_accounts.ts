import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount() {
    console.log("=== Accounts Info ===");
    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log("Profiles:", profiles);

    const { data: shops } = await supabase.from('shops').select('*');
    console.log("Shops:", shops);

    const { data: subscriptions } = await supabase.from('subscriptions').select('*');
    console.log("Subscriptions:", subscriptions);

    const { data: users } = await supabase.auth.admin.listUsers();
    console.log("Users:", users.users.map(u => ({ id: u.id, email: u.email })));
}

checkAccount();
