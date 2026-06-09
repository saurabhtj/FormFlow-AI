import { adminAuth } from '../firebase';

async function makeAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node src/scripts/makeAdmin.ts <email>');
    process.exit(1);
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Successfully made ${email} an admin!`);
    console.log(`Please ask ${email} to sign out and sign back in to refresh their token.`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error making ${email} an admin:`, error);
    process.exit(1);
  }
}

makeAdmin();
