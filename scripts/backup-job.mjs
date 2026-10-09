// Run from a trusted scheduled runner. No credentials in arguments, logs, or source.
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const {KISS_SITE_URL,BACKUP_JOB_SECRET,BACKUP_OUTPUT_DIR}=process.env;
if(!KISS_SITE_URL?.startsWith('https://')||!BACKUP_JOB_SECRET||!BACKUP_OUTPUT_DIR)throw Error('Set KISS_SITE_URL, BACKUP_JOB_SECRET and BACKUP_OUTPUT_DIR in the scheduler environment.');
const r=await fetch(new URL('/api/maintenance/backup',KISS_SITE_URL),{method:'POST',headers:{Authorization:'Bearer '+BACKUP_JOB_SECRET},signal:AbortSignal.timeout(120000)});
if(!r.ok)throw Error('Backup failed with status '+r.status+'; alert the operator.');
await mkdir(BACKUP_OUTPUT_DIR,{recursive:true,mode:0o700});const file=path.join(BACKUP_OUTPUT_DIR,'kiss-'+new Date().toISOString().replace(/:/g,'-')+'.enc');await writeFile(file,new Uint8Array(await r.arrayBuffer()),{mode:0o600});console.log('Encrypted backup saved successfully.');
