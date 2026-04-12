const { Client } = require('pg');
const fs = require('fs');

const schema = fs.readFileSync('/tmp/raphoon-crm/supabase/finance_schema.sql', 'utf8');

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
    console.log('Connected via ' + config.host + ':' + config.port);
    await client.query(schema);
    console.log('Finance schema applied successfully!');
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('Tables:', res.rows.map(function(r) { return r.table_name; }).join(', '));
    const count = await client.query("SELECT count(*) FROM ledger_transactions;");
    console.log('Ledger rows:', count.rows[0].count);
    return true;
  } catch (err) {
    console.error('Failed ' + config.port + ':', err.message);
    return false;
  } finally {
    try { await client.end(); } catch(e) {}
  }
}

async function main() {
  var success = false;
  for (var i = 0; i < configs.length; i++) {
    success = await tryConnect(configs[i]);
    if (success) break;
  }
}

main();
