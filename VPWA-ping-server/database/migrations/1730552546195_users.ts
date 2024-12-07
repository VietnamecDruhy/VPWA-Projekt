import BaseSchema from '@ioc:Adonis/Lucid/Schema'
import Hash from '@ioc:Adonis/Core/Hash'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('email', 255).notNullable().unique()
      table.string('password', 180).notNullable()
      table.string('name', 255).notNullable()
      table.string('nickname', 255).notNullable().unique()
      table.string('remember_me_token').nullable()
      /**
       * Uses timestampz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        id: -1,
        email: 'system@system.com',
        password: await Hash.make('system'),
        name: 'System',
        nickname: 'system',
        created_at: new Date(),
        updated_at: new Date()
      })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
