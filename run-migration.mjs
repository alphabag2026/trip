import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const sqls = [
    "ALTER TABLE `accommodation_assignments` ADD `accommodationPhotoUrl` varchar(1000)",
    "ALTER TABLE `accommodation_assignments` ADD `floorNumber` varchar(20)",
    "ALTER TABLE `pickup_assignments` ADD `vehiclePhotoUrl` varchar(1000)",
    "ALTER TABLE `pickup_assignments` ADD `vehiclePlateNumber` varchar(100)",
    "ALTER TABLE `pickup_assignments` ADD `vehicleColor` varchar(50)",
    "ALTER TABLE `pickup_assignments` ADD `vehicleType` varchar(100)"
  ];
  for (const sql of sqls) {
    try { 
      await conn.execute(sql); 
      console.log('OK:', sql.substring(0, 80)); 
    } catch(e) { 
      console.log('SKIP (already exists?):', e.message.substring(0, 100)); 
    }
  }
  await conn.end();
  console.log('Migration complete!');
}
run();
