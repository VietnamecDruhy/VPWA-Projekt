import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .increments('id');
      table
        .string('message', 512)
        .notNullable();
      table
        .integer('channel_id')
        .unsigned()
        .references('id')
        .inTable('channels')
        .notNullable()
        .onDelete("CASCADE");
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .notNullable()
        .onDelete("CASCADE");
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })

    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        message: 'Welcome to the general channel! This is a read-only channel for system announcements.',
        channel_id: -1, // general channel id
        user_id: -1,    // system user id
        created_at: new Date(),
        updated_at: new Date()
      })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
