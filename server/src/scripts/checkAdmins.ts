import { adminAuth } from '../firebase';

async function check() {
  const users = await adminAuth.listUsers();
  console.log('Users:');
  users.users.forEach(u => {
    console.log(`Email: ${u.email}, Admin: ${u.customClaims?.admin}`);
  });
  process.exit(0);
}
check();
