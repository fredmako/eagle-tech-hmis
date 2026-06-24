const { db, isRealSupabase } = require('../utils/db');

async function run() {
  const userEmailClean = 'fredrickmakori102@gmail.com';
  const userId = '81bdb482-d7e6-4e9e-9437-a32ecd5be8dd'; // simulation of user.id
  
  try {
    let profiles = await db.getDocuments("profiles", [
      { type: "equal", column: "email", value: userEmailClean },
    ]);
    console.log('Profiles fetched:', profiles);

    let activeProfile = profiles && profiles[0];
    if (!activeProfile) {
      console.log('Creating profile...');
      activeProfile = await db.createDocument("profiles", userId, {
        full_name: "Fredrick Makori (Super Admin)",
        role: "super_admin",
        facility_id: isRealSupabase ? "f1" : null,
        email: userEmailClean
      });
      console.log('Profile created:', activeProfile);
    } else {
      console.log('Profile exists. Checking if update needed...');
      if (activeProfile.role !== "super_admin" || activeProfile.email !== userEmailClean) {
        console.log('Updating profile...');
        await db.updateDocument("profiles", activeProfile.id, {
          role: "super_admin",
          email: userEmailClean
        });
        console.log('Profile updated successfully.');
      } else {
        console.log('No update needed.');
      }
    }
  } catch (err) {
    console.error('ERROR during profile operation:', err);
  }
}

run();
