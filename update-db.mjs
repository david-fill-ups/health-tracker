import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_igmIkY4vHaq5@ep-flat-violet-aie6ygas-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
});
await client.connect();

// Helper: update a Facility row by name (only sets non-null fields, only overwrites null columns)
async function updateFacility(name, updates) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [col, val] of Object.entries(updates)) {
    if (val != null) {
      setClauses.push(`"${col}" = COALESCE("${col}", $${idx})`);
      values.push(val);
      idx++;
    }
  }

  if (setClauses.length === 0) return;
  values.push(name);

  const sql = `UPDATE "Facility" SET ${setClauses.join(', ')} WHERE name = $${idx} RETURNING name, "websiteUrl", "portalUrl", phone`;
  const res = await client.query(sql, values);
  if (res.rows.length === 0) {
    console.warn(`  ⚠ No facility found with name: ${name}`);
  } else {
    console.log(`  ✓ Facility: ${res.rows[0].name}`);
  }
}

// Helper: update a Doctor row by name (only sets non-null fields, only overwrites null columns)
async function updateDoctor(name, updates) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [col, val] of Object.entries(updates)) {
    if (val != null) {
      setClauses.push(`"${col}" = COALESCE("${col}", $${idx})`);
      values.push(val);
      idx++;
    }
  }

  if (setClauses.length === 0) return;
  values.push(name);

  const sql = `UPDATE "Doctor" SET ${setClauses.join(', ')} WHERE name = $${idx} RETURNING name, "websiteUrl", "portalUrl", phone`;
  const res = await client.query(sql, values);
  if (res.rows.length === 0) {
    console.warn(`  ⚠ No doctor found with name: ${name}`);
  } else {
    console.log(`  ✓ Doctor: ${res.rows[0].name}`);
  }
}

console.log('\n=== UPDATING FACILITIES ===\n');

const facilityUpdates = [
  ['360 Physical Therapy', { websiteUrl: 'https://my360pt.com/', phone: '301-957-2564' }],
  ['AA Urology', { websiteUrl: 'https://aaurology.com/', phone: '410-266-8049' }],
  ['AAMG Maternal Fetal Medicine', { websiteUrl: 'https://www.myaamg.org/maternal-and-fetal-medicine', portalUrl: 'https://www.mfmofmd.com/patient-portal', phone: '410-224-4442' }],
  ['AAMG Midwifery', { websiteUrl: 'https://www.myaamg.org/bay-area-midwifery', phone: '443-481-4400' }],
  ['AAMG Physical Therapy', { websiteUrl: 'https://aamgphysicaltherapy.com/', phone: '443-481-1140' }],
  ['Aeroflow Sleep', { websiteUrl: 'https://aeroflowsleep.com/', phone: '800-480-5491' }],
  ['Allcare of Columbia', { websiteUrl: 'https://allcareofmdcolumbia.com/', phone: '410-290-9990' }],
  ['Alma', { websiteUrl: 'https://helloalma.com/', portalUrl: 'https://secure.helloalma.com/client-portal/login/' }],
  ['American Family Care', { websiteUrl: 'https://www.afcurgentcare.com/', phone: '833-361-4643' }],
  ['Anne Arundel Medical Group', { websiteUrl: 'https://www.luminishealth.org/en', portalUrl: 'https://mychart.aahs.org/MyChart/Authentication/Login', phone: '833-254-3600' }],
  ['Annapolis Pediatrics', { websiteUrl: 'https://annapolispediatrics.com/', portalUrl: 'https://mycw144.ecwcloud.com/portal20220/jsp/100mp/login_otp.jsp', phone: '410-263-6363' }],
  ['Bayside Pediatrics', { websiteUrl: 'https://www.myprivia.com/mybaysidepeds', portalUrl: 'https://www.myprivia.com/mybaysidepeds', phone: '410-224-7667' }],
  ['Capital Digestive Care', { websiteUrl: 'https://www.capitaldigestivecare.com/', phone: '240-737-0085' }],
  ['CareFirst BCBS', { websiteUrl: 'https://member.carefirst.com/members/home.page', portalUrl: 'https://member.carefirst.com/members/home.page', phone: '800-544-8703' }],
  ['Chesapeake Urology', { websiteUrl: 'https://www.unitedurology.com/chesapeake-urology/', portalUrl: 'https://www.unitedurology.com/chesapeake-urology/patient-resources/my-patient-portal/', phone: '301-598-9717' }],
  ['Cigna', { websiteUrl: 'https://www.cigna.com/', portalUrl: 'https://my.cigna.com/', phone: '800-997-1654' }],
  ['Columbia Prime Dental', { websiteUrl: 'https://columbiaprimedental.com/', phone: '410-381-8283' }],
  ['Community Radiology Associates', { websiteUrl: 'https://www.radnet.com/community-radiology/', portalUrl: 'https://myradnetpatientportal.com/', phone: '888-601-0943' }],
  ['CVS', { websiteUrl: 'https://www.cvs.com/pharmacy', portalUrl: 'https://www.caremark.com/', phone: '855-222-3183' }],
  ['Dodek Dental Group', { websiteUrl: 'https://www.drdodek.com/', portalUrl: 'https://www.patientconnect365.com/Dentists/Maryland/Columbia/21046/Dodek_Dental_Group', phone: '410-381-1344' }],
  ['Foot & Ankle Pain Center', { websiteUrl: 'https://www.footanklepaincenter.com/', phone: '410-575-3668' }],
  ['Fulton Pediatric Dental', { websiteUrl: 'https://www.fultonpediatricdental.com/', phone: '410-988-4647' }],
  ['GW Medical Faculty Associates', { websiteUrl: 'https://gwdocs.com/', portalUrl: 'https://mychart.gwdocs.com/MyChart/Authentication/Login', phone: '202-741-3000' }],
  ['Intermountain Medical Center', { websiteUrl: 'https://intermountainhealthcare.org', portalUrl: 'https://mychart.intermountainhealth.org/mychart/Authentication/Login', phone: '855-274-2517' }],
  ['Johns Hopkins Care at Home', { websiteUrl: 'https://www.hopkinsmedicine.org/care-at-home/', phone: '410-288-8969' }],
  ['Johns Hopkins Medical Imaging', { websiteUrl: 'https://www.hopkinsmedicine.org/patient-care/locations/medical-imaging-columbia', portalUrl: 'https://mychart.hopkinsmedicine.org/', phone: '443-574-5800' }],
  ['Johns Hopkins Medicine', { websiteUrl: 'https://www.hopkinsmedicine.org/', portalUrl: 'https://mychart.hopkinsmedicine.org/', phone: '800-318-4246' }],
  ['Kidnetworks', { websiteUrl: 'https://www.yourkidnetworks.com/', phone: '667-888-7337' }],
  ['LabCorp', { websiteUrl: 'https://www.labcorp.com/', portalUrl: 'https://patient.labcorp.com/', phone: '800-845-6167' }],
  ['Laurel Lakes Pediatric Dentistry', { websiteUrl: 'https://www.laurelmdpediatricdentistry.com/', phone: '240-459-8600' }],
  ['Laurel Radiology Services', { websiteUrl: 'http://capitolrad.com/', phone: '301-725-5398' }],
  ['Laurel Smile Design', { websiteUrl: 'https://laurelsmiledesign.com/', phone: '301-490-1700' }],
  ['Magnificent Minds Neurology', { websiteUrl: 'https://www.myprivia.com/magnificentmindsneurology', portalUrl: 'https://www.myprivia.com/magnificentmindsneurology', phone: '301-652-6800' }],
  ['Maryland Endocrine', { websiteUrl: 'https://marylandendocrine.com/', portalUrl: 'https://mycw15.eclinicalweb.com/portal875/jsp/100mp/login_otp.jsp', phone: '301-953-2080' }],
  ['Maryland Open MRI', { websiteUrl: 'https://washingtonopenmri.com/', phone: '301-483-4440' }],
  ['Maryland Spine & Sports Medicine', { websiteUrl: 'https://mdspinesports.com/', phone: '443-535-9900' }],
  ['Maryland State Doulas', { websiteUrl: 'https://marylandstatedoulas.com/', phone: '410-302-0562' }],
  ['McAuliffe Chiropractic', { websiteUrl: 'https://www.laurelmdchiropractor.com/', phone: '301-776-0755' }],
  ['MyEyeDr', { websiteUrl: 'https://www.myeyedr.com/', portalUrl: 'https://shop.myeyedr.com/account', phone: '888-725-5482' }],
  ['One Medical', { websiteUrl: 'https://www.onemedical.com/', portalUrl: 'https://app.onemedical.com/', phone: '888-405-6396' }],
  ['Orthopedic Solutions LLP', { websiteUrl: 'https://orthopedicsolutionsllp.com/', phone: '410-740-7030' }],
  ['Padder Health Services', { websiteUrl: 'https://padderhealth.com/', phone: '301-560-4747' }],
  ['Patient First', { websiteUrl: 'https://www.patientfirst.com/', portalUrl: 'https://portal.patientfirst.com/', phone: '800-447-8588' }],
  ['Patriot Urgent Care', { websiteUrl: 'https://patriotuc.com/location/laurel/', phone: '240-583-7482' }],
  ['Pediatric Development Center', { websiteUrl: 'https://www.pdcandme.com/', phone: '301-869-7505' }],
  ['Revolution Sports Medicine', { websiteUrl: 'https://revolutionhf.com/', phone: '240-512-0190' }],
  ['UM Prince George\'s Hospital Center', { websiteUrl: 'https://www.umms.org/capital', portalUrl: 'https://mychart.umms.org/', phone: '301-618-2000' }],
  ['UM Capital Region Medical Center', { websiteUrl: 'https://www.umms.org/capital', portalUrl: 'https://mychart.umms.org/', phone: '301-618-2000' }],
  ['UMD Laurel Medical Center', { websiteUrl: 'https://www.umms.org/locations/um-laurel-medical-center', portalUrl: 'https://mychart.umms.org/', phone: '240-677-1001' }],
];

for (const [name, updates] of facilityUpdates) {
  await updateFacility(name, updates);
}

console.log('\n=== UPDATING DOCTORS ===\n');

const doctorUpdates = [
  ['Aaron Twigg', { websiteUrl: 'https://mdspinesports.com/doctor/dr-aaron-twigg/', phone: '443-535-9900' }],
  ['Amna Choudhary', { websiteUrl: 'https://laurelsmiledesign.com/staff/', phone: '301-490-1700' }],
  ['Andrew Keenan', { websiteUrl: 'https://www.medstarhealth.org/doctors/andrew-m-keenan-md' }],
  ['Brenda Boggs', { websiteUrl: 'https://www.cannabiscardnp.com/' }],
  ['Carmen Salvaterra', { websiteUrl: 'https://www.hopkinsmedicine.org/community_physicians/profiles/results/directory/profile/0640706/carmen-salvaterra-1' }],
  ['David Fenig', { websiteUrl: 'https://www.unitedurology.com/chesapeake-urology/providers/david-m-fenig-md/', phone: '410-772-7000' }],
  ['Dina Piccioni', { websiteUrl: 'https://www.dtbirths.com/' }],
  ['Eric Emanuel', { websiteUrl: 'https://aaurology.com/team_member/dr-eric-emanuel/', phone: '410-266-8049' }],
  ['Jennifer Caniglio', { websiteUrl: 'https://www.luminishealth.org/en/find-a-provider/jennifer-caniglio', phone: '410-573-1094' }],
  ['Jessica Gorelick', { websiteUrl: 'https://www.jessicagorelicklcsw.com/' }],
  ['Kaiser Ahmad', { websiteUrl: 'https://www.padderhealth.com/kaiser.php', phone: '410-740-3635' }],
  ['Kasey Morrison', { websiteUrl: 'https://www.adventisthealthcare.com/doctors/profile/kasey-morrison/' }],
  ['Ludmila Tchakarova', { websiteUrl: 'https://columbiaprimedental.com/meet-dr-tchakarova' }],
  ['Lynn Gaynes-Kaplan', { websiteUrl: 'https://marylandendocrine.com/dr-lynne-gaynes-kaplan-retirement/' }],
  ['Nancy Vias', { websiteUrl: 'https://www.cannabiscardnp.com/', phone: '410-412-3470' }],
  ['Nicole Dennis', { phone: '410-412-3470' }],
  ['Olivia McGirr', { websiteUrl: 'https://secure.helloalma.com/providers/olivia-mcgirr/', phone: '240-624-2823' }],
  ['Ralph Tufano', { websiteUrl: 'https://www.hopkinsmedicine.org/profiles/results/directory/profile/0015647/ralph-tufano' }],
  ['Richard Chasen', { websiteUrl: 'https://www.capitaldigestivecare.com/doctors-providers/richard-m-chasen-md-facg/', phone: '240-737-0085' }],
  ['Rita Pabla', { websiteUrl: 'https://padderhealth.com/providers/rita-pabla/', phone: '301-560-4747' }],
  ['Rosalie Naglieri', { websiteUrl: 'https://profiles.hopkinsmedicine.org/provider/rosalie-naglieri/2789037' }],
  ['Samuel Dodek', { websiteUrl: 'https://www.drdodek.com/meet-us/samuel-m-dodek-iii-dds/', phone: '410-381-1344' }],
  ['Stephanie Zwonitzer', { websiteUrl: 'https://www.unitedurology.com/chesapeake-urology/providers/stephanie-zwonitzer-dnp-crnp/', phone: '410-772-7000' }],
  ['Vicki Hyatt', { phone: '410-826-0170' }],
  ['James Kunec', { websiteUrl: 'https://www.umms.org/find-a-doctor/profiles/dr-james-r-kunec-md-1407917768' }],
];

for (const [name, updates] of doctorUpdates) {
  await updateDoctor(name, updates);
}

console.log('\n=== DONE ===\n');
await client.end();
