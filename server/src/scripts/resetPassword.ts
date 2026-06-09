import { adminAuth } from '../firebase';

async function reset() {
  try {
    const user = await adminAuth.getUserByEmail('saurabhjijil@gmail.com');
    await adminAuth.updateUser(user.uid, { password: 'password123' });
    console.log('Password successfully reset!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
reset();
