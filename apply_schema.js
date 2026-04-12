const { Client } = require('pg');
const fs = require('fs');

const schema = fs.readFileSync('/home/chrisdyson/raphoon-crm/supabase/schema.sql', 'utf8');

// Try session pooler on port 6543
const configs = [
  {
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.hkagsntwwlwyzjhgpmpw',
    password: 'thisV0BJ5U0bvap8GSAw',
    ssl: { rejectUnauthorized: false }
  },
  {
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres', 
    user: 'postgres.hkagsntwwlwyzjhgpmpw',
    password: 'thisV0BJ5U0bvap8GSAw',
    ssl: { rejectUnauthorized: false }
  }
];

async function tryConnect(config) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`Connected via ${config.host}:${config.port}!`);
    await client.query(schema);
    console.log('Schema applied successfully!');
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));
    return true;
  } catch (err) {
    console.error(`Failed ${config.port}:`, err.message);
    return false;
  } finally {
    try { await client.end(); } catch(e) {}
  }
}

async function main() {
  for (const config of configs) {
    const ok = await tryConnect(config);
    if (ok) break;
  }
}

main();
