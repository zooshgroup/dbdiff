var pg = require('pg')
var querystring = require('querystring')

class PostgresClient {
  constructor (conOptions) {
    if (typeof conOptions === 'string') {
      const [_, dialect, user, password, host, database] = conOptions.match('^(.*?)://(.*?):(.*?)@(.*?)/(.*?)$')
      conOptions = {
        dialect,
        user,
        password,
        database,
        host,
        dialectOptions: {
          ssl: false
        }
      }
    }
    this.client = new pg.Client(conOptions);
  }

  dropTables () {
    return this.query('drop schema public cascade; create schema public;')
  }

  connect () {
    if (client._connected) return Promise.resolve();
    return this.client.connect()
  }

  query (sql, params) {
    return this.client.query(sql, params)
  }

  find (sql, params = []) {
    return this.query(sql, params).then((result) => result.rows)
  }

  findOne (sql, params = []) {
    return this.query(sql, params).then((result) => result.rows[0])
  }

  end () {
    return this.client.end();
  }
}

module.exports = PostgresClient
