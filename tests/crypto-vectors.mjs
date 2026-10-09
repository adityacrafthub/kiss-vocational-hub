import assert from 'node:assert/strict';
import {totp,base32} from '../lib/crypto-utils.ts';
const secret=base32(new TextEncoder().encode('12345678901234567890'));
for(const [time,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']])assert.equal(await totp(secret,Math.floor(time/30),8),expected);
console.log('PASS: RFC 6238 SHA-1 reference vectors');
