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
      const now = new Date().toISOString()
      await db.table(this.tableName).insert({
        message: 'Welcome to the general channel! This is a read-only channel for system announcements.\n\n' +
          'Available commands:\n' +
          '/list - Show all members in the current channel\n' +
          '/cancel - Leave the current channel (deletes channel if you\'re the owner)\n' +
          '/quit - Delete the channel (owner only)\n' +
          '/revoke <username> - Remove a user from the channel (owner only)\n' +
          '/kick <username> - Vote to kick a user from the channel\n' +
          '/invite <username> - Invite a user to the channel\n' +
          '/help - Show this help message',
        channel_id: -1,
        user_id: -1,
        created_at: now,
        updated_at: now
      })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
