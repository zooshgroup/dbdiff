/* globals describe it */
var assert = require('assert')
var childProcess = require('child_process')

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

const exec = (cmd) => {
  return new Promise((resolve, reject) => {
    childProcess.exec(cmd, (err, stdout, stderr) => {
      err && !stderr ? reject(err) : resolve({ stdout, stderr })
    })
  })
}

describe('CLI interface', () => {
  before('connect', () => {
    return utils.connect();
  })

  after('end', () => {
    return utils.end();
  })

  it('should run as a cli application', () => {
    var conString1 = 'postgres://postgres:postgres@localhost/db1'
    var conString2 = 'postgres://postgres:postgres@localhost/db2'

    return utils.runCommands(['CREATE SEQUENCE seq_name'], [])
      .then(() => exec(`node index.js ${conString1} ${conString2}`))
      .then((result) => {
        var { stdout } = result
        assert.equal(stdout, 'DROP SEQUENCE IF EXISTS "public"."seq_name" CASCADE;\n')
      })
  });

  it('should run as a cli application with level argument', () => {
    var conString1 = 'postgres://postgres:postgres@localhost/db1'
    var conString2 = 'postgres://postgres:postgres@localhost/db2'

    return utils.runCommands(['CREATE TABLE users (email VARCHAR(255))'], [])
      .then(() => exec(`node index.js -l safe ${conString1} ${conString2}`))
      .then((result) => {
        var { stdout } = result
        assert.equal(stdout, '-- DROP SCHEMA IF EXISTS "public" CASCADE;\n\n-- DROP TABLE IF EXISTS "public"."users" CASCADE;\n')
      })
  })

  it('should fail with an error', () => {
    var conString1 = 'postgres://postgres:postgres@localhost/db1'
    var conString2 = 'postgres://postgres:postgres@localhost/none'

    return exec(`node index.js ${conString1} ${conString2}`)
      .then((result) => {
        var { stderr } = result
        assert.ok(stderr.indexOf('error: database "none" does not exist') >= 0)
      })
  })
})
