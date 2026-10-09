import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// A versioned workspace snapshot keeps cross-module operations atomic for this shared workspace.
export const workspace = sqliteTable('workspace', {id:integer('id').primaryKey(), revision:integer('revision').notNull().default(0), data:text('data').notNull()});

// Accounts and sessions are separate from business records; secrets never enter admin exports.
export const accounts = sqliteTable('accounts', {
 id:text('id').primaryKey(), email:text('email').notNull().unique(), name:text('name').notNull(),
 password:text('password').notNull(), salt:text('salt').notNull(), role:text('role').notNull(), created:text('created').notNull(), verified:integer('verified').notNull().default(0)
});
export const sessions = sqliteTable('sessions', {token:text('token').primaryKey(), account:text('account').notNull(), expires:integer('expires').notNull(),mfa:integer('mfa').notNull().default(0)});
export const authLimits = sqliteTable('auth_limits', {key:text('key').primaryKey(), count:integer('count').notNull(), expires:integer('expires').notNull()});
export const media = sqliteTable('media', {id:text('id').primaryKey(), name:text('name').notNull(), type:text('type').notNull(), size:integer('size').notNull(), owner:text('owner').notNull(), created:text('created').notNull()});

export const accountProvisioning = sqliteTable('account_provisioning', {revision:text('revision').primaryKey()});

export const verificationChallenges=sqliteTable('verification_challenges',{id:text('id').primaryKey(), identity:text('identity').notNull(), role:text('role').notNull(), purpose:text('purpose').notNull(), code:text('code').notNull(), payload:text('payload').notNull(), expires:integer('expires').notNull(), attempts:integer('attempts').notNull().default(0)});

export const adminMfa=sqliteTable('admin_mfa',{account:text('account').primaryKey(),secret:text('secret').notNull(),enabled:integer('enabled').notNull().default(0),lastStep:integer('last_step').notNull().default(-1)});
export const mfaChallenges=sqliteTable('mfa_challenges',{id:text('id').primaryKey(),account:text('account').notNull(),expires:integer('expires').notNull(),attempts:integer('attempts').notNull().default(0)});
export const mfaRecovery=sqliteTable('mfa_recovery',{code:text('code').primaryKey(),account:text('account').notNull()});
export const securityAudit=sqliteTable('security_audit',{id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),target:text('target').notNull(),created:text('created').notNull()});
