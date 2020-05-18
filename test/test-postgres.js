/* globals describe it */
var dedent = require('dedent')

var conString1 = 'postgres://postgres:postgres@localhost/db1'
var conSettings2 = {
  dialect: 'postgres',
  user: 'postgres',
  password: 'postgres',
  database: 'db2',
  host: 'localhost',
  dialectOptions: {
    ssl: false
  }
}
var utils = require('./utils')('postgres', conString1, conSettings2)

describe('Postgresql', () => {
  before('connect', () => {
    return utils.connect();
  })

  after('end', () => {
    return utils.end();
  })

  it('should create a table', () => {
    var commands1 = []
    var commands2 = ['CREATE TABLE users (email VARCHAR(255), tags varchar(255)[], num numeric(15, 10), num_no_scale numeric)']
    var expected = dedent`
      CREATE SCHEMA IF NOT EXISTS "public";

      CREATE TABLE "public"."users" (
        "email" character varying(255) NULL,
        "tags" varchar[] NULL,
        "num" numeric(15,10) NULL,
        "num_no_scale" numeric NULL
      );
    `
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should drop a table', () => {
    var commands1 = ['CREATE TABLE users (email VARCHAR(255))']
    var commands2 = []
    return Promise.resolve()
      .then(() => {
        var expected = dedent`
        DROP SCHEMA IF EXISTS "public" CASCADE;

        DROP TABLE IF EXISTS "public"."users" CASCADE;
      `
        return utils.runAndCompare(commands1, commands2, expected, ['drop'])
      })
      .then(() => {
        var expected = dedent`
        -- DROP SCHEMA IF EXISTS "public" CASCADE;

        -- DROP TABLE IF EXISTS "public"."users" CASCADE;
        `
        return utils.runAndCompare(commands1, commands2, expected, ['safe', 'warn'])
      })
  }).timeout(5000)

  it('should create a table wih a serial sequence', () => {
    var commands1 = []
    var commands2 = ['CREATE TABLE users (id serial)']
    var expected = dedent`
      CREATE SCHEMA IF NOT EXISTS "public";

      CREATE SEQUENCE "public"."users_id_seq" INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 NO CYCLE;

      CREATE TABLE "public"."users" (
        "id" integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL
      );
    `
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should add a column to a table', () => {
    var commands1 = ['CREATE TABLE users (email VARCHAR(255))']
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN num NUMERIC(15, 10)'
    ]
    var expected = 'ALTER TABLE "public"."users" ADD COLUMN "first_name" character varying(255) NULL;\n\n' +
      'ALTER TABLE "public"."users" ADD COLUMN "num" numeric(15,10) NULL;'
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should drop a column from a table', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))'
    ]
    return Promise.resolve()
      .then(() => {
        var expected = 'ALTER TABLE "public"."users" DROP COLUMN "first_name";'
        return utils.runAndCompare(commands1, commands2, expected, ['drop'])
      })
      .then(() => {
        var expected = '-- ALTER TABLE "public"."users" DROP COLUMN "first_name";'
        return utils.runAndCompare(commands1, commands2, expected, ['safe', 'warn'])
      })
  }).timeout(5000)

  it('should change the type of a column', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(200)'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)'
    ]
    return Promise.resolve()
      .then(() => {
        var expected = dedent`
          -- Previous data type was character varying(200)
          ALTER TABLE "public"."users" ALTER COLUMN "first_name" SET DATA TYPE character varying(255);
        `
        return utils.runAndCompare(commands1, commands2, expected, ['drop', 'warn'])
      })
      .then(() => {
        var expected = dedent`
          -- Previous data type was character varying(200)
          -- ALTER TABLE "public"."users" ALTER COLUMN "first_name" SET DATA TYPE character varying(255);
        `
        return utils.runAndCompare(commands1, commands2, expected, ['safe'])
      })
  }).timeout(5000)

  it('should change the type of a column - numeric precision', () => {
    var commands1 = [
      'create table tab_with_num (email VARCHAR(255))',
      'alter table tab_with_num add column num numeric(10, 5)'
    ]
    var commands2 = [
      'create table tab_with_num (email VARCHAR(255))',
      'alter table tab_with_num add column num numeric(20, 10)'
    ]
    return Promise.resolve()
      .then(() => {
        var expected = dedent`
          -- Previous data type was numeric(10,5)
          ALTER TABLE "public"."tab_with_num" ALTER COLUMN "num" SET DATA TYPE numeric(20,10);
        `
        return utils.runAndCompare(commands1, commands2, expected, ['drop', 'warn'])
      })
      .then(() => {
        var expected = dedent`
          -- Previous data type was numeric(10,5)
          -- ALTER TABLE "public"."tab_with_num" ALTER COLUMN "num" SET DATA TYPE numeric(20,10);
        `
        return utils.runAndCompare(commands1, commands2, expected, ['safe'])
      })
  })

  it('should change a column to not nullable', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255) NOT NULL'
    ]
    return Promise.resolve()
      .then(() => {
        var expected = 'ALTER TABLE "public"."users" ALTER COLUMN "first_name" SET NOT NULL;'
        return utils.runAndCompare(commands1, commands2, expected, ['drop', 'warn'])
      })
      .then(() => {
        var expected = '-- ALTER TABLE "public"."users" ALTER COLUMN "first_name" SET NOT NULL;'
        return utils.runAndCompare(commands1, commands2, expected, ['safe'])
      })
  }).timeout(5000)

  it('should change a column to nullable', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255) NOT NULL'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)'
    ]
    var expected = 'ALTER TABLE "public"."users" ALTER COLUMN "first_name" DROP NOT NULL;'
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should create a sequence', () => {
    var commands1 = []
    var commands2 = ['CREATE SEQUENCE seq_name']
    var expected = 'CREATE SEQUENCE "public"."seq_name" INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 NO CYCLE;'
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should drop a sequence', () => {
    var commands1 = ['CREATE SEQUENCE seq_name']
    var commands2 = []
    var expected = 'DROP SEQUENCE IF EXISTS "public"."seq_name" CASCADE;'
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  // TODO: update a sequence

  it('should create an index', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)',
      'CREATE INDEX users_email ON "users" (email)'
    ]
    var expected = 'CREATE INDEX "users_email" ON "public"."users" USING btree ("email");'
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should drop an index', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)',
      'CREATE INDEX users_email ON users (email)'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)'
    ]
    var expected = 'DROP INDEX "public"."users_email";'
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should recreate an index', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN last_name VARCHAR(255)',
      'CREATE INDEX some_index ON "users" (first_name)'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'ALTER TABLE users ADD COLUMN first_name VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN last_name VARCHAR(255)',
      'CREATE INDEX some_index ON "users" (last_name)'
    ]
    var expected = dedent`
      -- Index "public"."some_index" needs to be changed

      DROP INDEX "public"."some_index";

      CREATE INDEX "some_index" ON "public"."users" USING btree ("last_name");
    `
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should create a table with an index', () => {
    var commands1 = []
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255))',
      'CREATE INDEX users_email ON users (email)'
    ]
    var expected = dedent`
      CREATE SCHEMA IF NOT EXISTS "public";

      CREATE TABLE "public"."users" (
        "email" character varying(255) NULL
      );

      CREATE INDEX "users_email" ON "public"."users" USING btree ("email");
    `
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should support all constraint types', () => {
    var commands1 = []
    var commands2 = [
      'CREATE TABLE users (id serial, email VARCHAR(255));',
      'CREATE TABLE items (id serial, name VARCHAR(255), user_id bigint);',
      'ALTER TABLE users ADD CONSTRAINT users_pk PRIMARY KEY (id);',
      'ALTER TABLE users ADD CONSTRAINT email_unique UNIQUE (email);',
      'ALTER TABLE items ADD CONSTRAINT items_fk FOREIGN KEY (user_id) REFERENCES users (id);',
      'ALTER TABLE items ADD CONSTRAINT items_fk2 FOREIGN KEY (user_id) REFERENCES users (id) ON UPDATE CASCADE on delete set null;'
    ]
    var expected = dedent`
      CREATE SCHEMA IF NOT EXISTS "public";

      CREATE SEQUENCE "public"."items_id_seq" INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 NO CYCLE;

      CREATE SEQUENCE "public"."users_id_seq" INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 NO CYCLE;

      CREATE TABLE "public"."items" (
        "id" integer DEFAULT nextval('items_id_seq'::regclass) NOT NULL,
        "name" character varying(255) NULL,
        "user_id" bigint NULL
      );

      CREATE TABLE "public"."users" (
        "id" integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
        "email" character varying(255) NULL
      );

      ALTER TABLE "public"."users" ADD CONSTRAINT "users_pk" PRIMARY KEY ("id");

      ALTER TABLE "public"."users" ADD CONSTRAINT "email_unique" UNIQUE ("email");

      ALTER TABLE "public"."items" ADD CONSTRAINT "items_fk2" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
      
      ALTER TABLE "public"."items" ADD CONSTRAINT "items_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id");
    `
    return utils.runAndCompare(commands1, commands2, expected)
  }).timeout(5000)

  it('should support existing constriants with the same name', () => {
    var commands1 = [
      'CREATE TABLE users (email VARCHAR(255), api_key VARCHAR(255));',
      'ALTER TABLE users ADD CONSTRAINT a_unique_constraint UNIQUE (email);'
    ]
    var commands2 = [
      'CREATE TABLE users (email VARCHAR(255), api_key VARCHAR(255));',
      'ALTER TABLE users ADD CONSTRAINT a_unique_constraint UNIQUE (api_key);'
    ]
    return Promise.resolve()
      .then(() => {
        var expected = dedent`
          ALTER TABLE "public"."users" DROP CONSTRAINT "a_unique_constraint";

          ALTER TABLE "public"."users" ADD CONSTRAINT "a_unique_constraint" UNIQUE ("api_key");
        `
        return utils.runAndCompare(commands1, commands2, expected, ['warn', 'drop'])
      })
      .then(() => {
        var expected = dedent`
          ALTER TABLE "public"."users" DROP CONSTRAINT "a_unique_constraint";

          -- ALTER TABLE "public"."users" ADD CONSTRAINT "a_unique_constraint" UNIQUE ("api_key");
        `
        return utils.runAndCompare(commands1, commands2, expected, ['safe'])
      })
  }).timeout(5000)
})
