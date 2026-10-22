import { rawDb } from '@/db';
import { sql } from 'drizzle-orm';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
export async function checkReadiness() {
  const client=new S3Client({endpoint:process.env.CLOUD_STORAGE_ENDPOINT,region:process.env.CLOUD_STORAGE_REGION || 'garage',forcePathStyle:true,credentials:{accessKeyId:process.env.CLOUD_STORAGE_ACCESS_KEY_ID || '',secretAccessKey:process.env.CLOUD_STORAGE_SECRET_ACCESS_KEY || ''},maxAttempts:1});
  const results=await Promise.allSettled([
    rawDb.execute(sql`select 1`),
    client.send(new HeadBucketCommand({Bucket:process.env.CLOUD_STORAGE_BUCKET}),{abortSignal:AbortSignal.timeout(2000)})
  ]);client.destroy();
  const dependencies={postgres:results[0].status==='fulfilled'?'up':'down',storage:results[1].status==='fulfilled'?'up':'down'};
  return {status:Object.values(dependencies).every(s=>s==='up')?'ready':'waiting',dependencies};
}
