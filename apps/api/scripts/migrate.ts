import { migrate } from 'drizzle-orm/postgres-js/migrator';
import process from 'node:process';

import { rawDb as db, databaseClient } from '../src/db';

function errorCodes(error:unknown):string[]{
  const codes:string[]=[];
  let current:unknown=error;
  for(let depth=0;depth<4&&current&&typeof current==='object';depth++){
    const value=current as {code?:unknown;cause?:unknown};
    if(typeof value.code==='string'&&/^[A-Z0-9_]{1,40}$/.test(value.code))codes.push(value.code);
    current=value.cause;
  }
  return codes;
}

try {
  for(let attempt=0;attempt<3;attempt++){
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('Foundation migrations applied.');
      break;
    } catch(error) {
      const transient=new Set(['ECONNREFUSED','ECONNRESET','ETIMEDOUT','CONNECT_TIMEOUT','CONNECTION_CLOSED','CONNECTION_ENDED','57P03']);
      if(attempt===2||!errorCodes(error).some(code=>transient.has(code)))throw error;
      console.warn('Local database connection is not ready; retrying migration ('+(attempt+1)+'/2).');
      await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
    }
  }
} catch (error) {
  const codes=errorCodes(error);
  console.error('Foundation migration failed; inspect local database readiness and migration files. Secrets are omitted.');
  if(codes.length)console.error('Migration error codes: '+codes.join(', '));
  process.exitCode = 1;
} finally {
  await databaseClient.end({ timeout: 2 });
}
