import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_igmIkY4vHaq5@ep-flat-violet-aie6ygas-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
});
await client.connect();
const facilities = await client.query('SELECT id, name, type, "websiteUrl", "portalUrl" FROM "Facility" ORDER BY name');
const doctors = await client.query('SELECT id, name, specialty, "websiteUrl", "portalUrl" FROM "Doctor" ORDER BY name');
console.log('FACILITIES:', JSON.stringify(facilities.rows, null, 2));
console.log('DOCTORS:', JSON.stringify(doctors.rows, null, 2));
await client.end();
