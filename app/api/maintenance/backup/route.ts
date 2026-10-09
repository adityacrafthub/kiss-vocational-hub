import {settings,json,failure,HttpError} from '@/lib/security';
import {equal} from '@/lib/crypto-utils';
import {limit} from '@/lib/auth-utils';
import {createBackup} from '@/lib/backup';
import {audit} from '@/lib/audit';
export async function POST(r:Request){try{const secret=settings().BACKUP_JOB_SECRET;if(!secret||secret.length<32)throw new HttpError('Backup job is not configured.',503);if(!equal(r.headers.get('authorization')||'','Bearer '+secret))throw new HttpError('Unauthorized.',401);await limit('backup-job',2,3600000);const out=await createBackup();await audit('backup-job','encrypted_backup_created',out.name);return new Response(out.envelope,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store','Content-Disposition':'attachment; filename="kiss-backup.enc"'}})}catch(e){return failure(e)}}
