import { adminAuth } from '../firebase';

async function makeFirstAdmin() {
  try {
    const list = await adminAuth.listUsers(1);
    if (list.users.length > 0) {
      const user = list.users[0];
      await adminAuth.setCustomUserClaims(user.uid, { admin: true });
      console.log(`✅ Successfully elevated ${user.email} to Admin!`);
      process.exit(0);
    } else {
      console.log('No users found in database!');
      process.exit(1);
    }
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
makeFirstAdmin();
