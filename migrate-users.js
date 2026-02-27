const { Player, sequelize } = require('./models');
const { testConnection } = require('./config/database');

// Generate unique 8-digit profile ID
const generateProfileId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = String(Math.floor(10000000 + Math.random() * 90000000));
    const found = await Player.findOne({ where: { profile_id: id } });
    exists = !!found;
  }
  return id;
};

// Check if column exists in table
const columnExists = async (tableName, columnName) => {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='${tableName}' AND column_name='${columnName}';
    `);
    return results.length > 0;
  } catch (error) {
    return false;
  }
};

// Check if table exists
const tableExists = async (tableName) => {
  try {
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' AND table_name='${tableName}';
    `);
    return results.length > 0;
  } catch (error) {
    return false;
  }
};

async function migrateUsers() {
  try {
    await testConnection();
    
    console.log('🔄 Starting database migration...\n');
    
    // Step 1: Add profile_id column if it doesn't exist
    console.log('📋 Step 1: Checking profile_id column...');
    const profileIdExists = await columnExists('players', 'profile_id');
    
    if (!profileIdExists) {
      console.log('   Adding profile_id column...');
      await sequelize.query(`
        ALTER TABLE players 
        ADD COLUMN profile_id VARCHAR(8) UNIQUE;
      `);
      console.log('   ✅ profile_id column added');
    } else {
      console.log('   ✅ profile_id column already exists');
    }
    
    // Step 2: Add losses columns if they don't exist
    console.log('\n📋 Step 2: Checking losses columns...');
    const lossesComputerExists = await columnExists('players', 'losses_vs_computer');
    const lossesPlayersExists = await columnExists('players', 'losses_vs_players');
    
    if (!lossesComputerExists) {
      console.log('   Adding losses_vs_computer column...');
      await sequelize.query(`
        ALTER TABLE players 
        ADD COLUMN losses_vs_computer INTEGER DEFAULT 0;
      `);
      console.log('   ✅ losses_vs_computer column added');
    } else {
      console.log('   ✅ losses_vs_computer column already exists');
    }
    
    if (!lossesPlayersExists) {
      console.log('   Adding losses_vs_players column...');
      await sequelize.query(`
        ALTER TABLE players 
        ADD COLUMN losses_vs_players INTEGER DEFAULT 0;
      `);
      console.log('   ✅ losses_vs_players column added');
    } else {
      console.log('   ✅ losses_vs_players column already exists');
    }
    
    // Step 3: Add avatar_color column if it doesn't exist
    console.log('\n📋 Step 3: Checking avatar_color column...');
    const avatarColorExists = await columnExists('players', 'avatar_color');
    
    if (!avatarColorExists) {
      console.log('   Adding avatar_color column...');
      await sequelize.query(`
        ALTER TABLE players 
        ADD COLUMN avatar_color VARCHAR(20) DEFAULT 'red';
      `);
      console.log('   ✅ avatar_color column added');
    } else {
      console.log('   ✅ avatar_color column already exists');
    }
    
    // Step 4: Add wins columns if they don't exist
    console.log('\n📋 Step 4: Checking wins columns...');
    const winsComputerExists = await columnExists('players', 'wins_vs_computer');
    const winsPlayersExists = await columnExists('players', 'wins_vs_players');
    
    if (!winsComputerExists) {
      console.log('   Adding wins_vs_computer column...');
      await sequelize.query(`
        ALTER TABLE players 
        ADD COLUMN wins_vs_computer INTEGER DEFAULT 0;
      `);
      console.log('   ✅ wins_vs_computer column added');
    } else {
      console.log('   ✅ wins_vs_computer column already exists');
    }
    
    if (!winsPlayersExists) {
      console.log('   Adding wins_vs_players column...');
      await sequelize.query(`
        ALTER TABLE players 
        ADD COLUMN wins_vs_players INTEGER DEFAULT 0;
      `);
      console.log('   ✅ wins_vs_players column added');
    } else {
      console.log('   ✅ wins_vs_players column already exists');
    }
    
    // Step 5: Add total_games column if it doesn't exist
    console.log('\n📋 Step 5: Checking total_games column...');
    const totalGamesExists = await columnExists('players', 'total_games');
    
    if (!totalGamesExists) {
      console.log('   Adding total_games column...');
      await sequelize.query(`
        ALTER TABLE players 
        ADD COLUMN total_games INTEGER DEFAULT 0;
      `);
      console.log('   ✅ total_games column added');
    } else {
      console.log('   ✅ total_games column already exists');
    }
    
    // Step 6: Create friendships table if it doesn't exist
    console.log('\n📋 Step 6: Checking friendships table...');
    const friendshipsTableExists = await tableExists('friendships');
    
    if (!friendshipsTableExists) {
      console.log('   Creating friendships table...');
      await sequelize.query(`
        CREATE TABLE friendships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          requester_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          addressee_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(requester_id, addressee_id)
        );
      `);
      console.log('   ✅ friendships table created');
    } else {
      console.log('   ✅ friendships table already exists');
    }
    
    // Step 7: Update existing rows to have default values
    console.log('\n📋 Step 7: Setting default values for existing records...');
    await sequelize.query(`
      UPDATE players 
      SET losses_vs_computer = COALESCE(losses_vs_computer, 0),
          losses_vs_players = COALESCE(losses_vs_players, 0),
          wins_vs_computer = COALESCE(wins_vs_computer, 0),
          wins_vs_players = COALESCE(wins_vs_players, 0),
          total_games = COALESCE(total_games, 0),
          avatar_color = COALESCE(avatar_color, 'red')
      WHERE losses_vs_computer IS NULL OR losses_vs_players IS NULL 
         OR wins_vs_computer IS NULL OR wins_vs_players IS NULL
         OR total_games IS NULL OR avatar_color IS NULL;
    `);
    console.log('   ✅ Default values set');
    
    // Step 8: Assign profile_ids to users without them
    console.log('\n📋 Step 8: Assigning profile IDs...');
    const usersWithoutProfileId = await Player.findAll({
      where: {
        profile_id: null
      }
    });
    
    if (usersWithoutProfileId.length === 0) {
      console.log('   ✅ All users already have profile_id assigned');
    } else {
      console.log(`   Found ${usersWithoutProfileId.length} users without profile_id`);
      
      for (const user of usersWithoutProfileId) {
        const profileId = await generateProfileId();
        user.profile_id = profileId;
        await user.save();
        console.log(`   ✓ Assigned ${profileId} to ${user.username}`);
      }
      
      console.log(`   ✅ Successfully assigned ${usersWithoutProfileId.length} profile IDs`);
    }
    
    // Step 9: Display all users
    console.log('\n📋 Step 9: Current database state:\n');
    const allUsers = await Player.findAll({
      attributes: ['username', 'profile_id', 'created_at', 'wins_vs_computer', 'losses_vs_computer', 'wins_vs_players', 'losses_vs_players', 'total_games'],
      order: [['created_at', 'DESC']]
    });
    
    console.log('   ┌─────────────────────────────────────────────────────────────────┐');
    console.log('   │ USERNAME          PROFILE_ID  WINS(AI) LOSS(AI) WINS(PL) LOSS(PL)│');
    console.log('   ├─────────────────────────────────────────────────────────────────┤');
    allUsers.forEach(user => {
      const username = (user.username || '').padEnd(16);
      const profileId = (user.profile_id || 'N/A').padEnd(10);
      const winsAI = String(user.wins_vs_computer || 0).padStart(8);
      const lossAI = String(user.losses_vs_computer || 0).padStart(8);
      const winsPL = String(user.wins_vs_players || 0).padStart(8);
      const lossPL = String(user.losses_vs_players || 0).padStart(8);
      console.log(`   │ ${username} ${profileId} ${winsAI} ${lossAI} ${winsPL} ${lossPL}│`);
    });
    console.log('   └─────────────────────────────────────────────────────────────────┘');
    console.log(`\n   Total users: ${allUsers.length}\n`);
    
    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

migrateUsers();
