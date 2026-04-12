const {Client} = require('pg');
const configs = [
  {user: 'postgres', host: 'aws-0-us-east-1.pooler.supabase.com', port: 6543},
  {user: 'postgres', host: 'aws-0-us-east-1.pooler.supabase.com', port: 5432},
  {user: 'postgres', host: 'hkagsntwwlwyzjhgpmpw.supabase.co', port: 5432},
];
(async () => {
  for (const c of configs) {
    const client = new Client({...c, database:'postgres', password:'thisV0BJ5U0bvap8GSAw', ssl:{rejectUnauthorized:false}});
    try {
      await client.connect();
      console.log('CONNECTED:', JSON.stringify(c));
      await client.end();
      break;
    } catch(e) {
      console.log('FAIL port=' + c.port + ':', e.message.substring(0,100));
      try { await client.end(); } catch(_) {}
    }
  }
})();
