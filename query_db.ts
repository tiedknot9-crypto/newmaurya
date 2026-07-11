import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nlyfngpitxuqtczeqjaw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_q0e5J5_yWRYl_KHS7U6HhA_zbTpGZdC';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying beds in the database...');
  const { data, error } = await supabase
    .from('beds')
    .select('*');
  
  if (error) {
    console.error('Error fetching beds:', error);
  } else {
    console.log('Total beds:', data?.length);
    console.log('Sample bed:', JSON.stringify(data?.[0], null, 2));
  }
}

run();
