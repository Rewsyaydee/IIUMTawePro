const fs = require('fs');
const env = {};
fs.readFileSync('C:/Users/Rusyaidi/Documents/TawePro/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([^#][^=]+)=(.*)$/); if (m) env[m[1].trim()] = m[2].trim();
});

const JWT = JSON.parse(fs.readFileSync('C:/Users/Rusyaidi/Documents/TawePro/tests/stress/students.json', 'utf8'));
const token = JWT.students[0].jwt;
const URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  // 1. Check user exists
  const userRes = await fetch(URL + '/rest/v1/users?select=id,telegram_id,name,role,status&telegram_id=eq.stress-100000001', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  });
  const users = await userRes.json();
  console.log('DB user:', JSON.stringify(users[0] || 'NOT FOUND', null, 2));

  if (!users[0]) { console.log('User not found!'); return; }

  // 2. Try direct attendance insert via service role
  const insertRes = await fetch(URL + '/rest/v1/student_attendance', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify([{
      user_id: users[0].id,
      schedule_item_id: 'test-001',
      event_title: 'Test Event',
      student_name: 'Test Student',
      matric_number: '2000001',
      latitude: 3.2511,
      longitude: 101.7335,
      status: 'present'
    }])
  });
  const insertData = await insertRes.text();
  console.log('Direct insert status:', insertRes.status);
  console.log('Direct insert body:', insertData.slice(0, 500));

  // 3. Try via RPC
  const rpcRes = await fetch('https://iium-tawe-pro.vercel.app/api/rpc', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'attendance.submit',
      scheduleItemId: 'test-002',
      eventTitle: 'Test RPC',
      studentName: 'RPC Test',
      matricNumber: '2000001',
      latitude: 3.2511,
      longitude: 101.7335,
      status: 'present'
    })
  });
  const rpcData = await rpcRes.text();
  console.log('RPC submit status:', rpcRes.status);
  console.log('RPC submit body:', rpcData.slice(0, 500));
}

main().catch(e => console.error(e));
