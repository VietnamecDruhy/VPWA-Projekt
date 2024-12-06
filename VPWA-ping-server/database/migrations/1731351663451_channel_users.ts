import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'channel_users'

  public async up() {
    // Drop the table if it exists (optional, ensure proper schema management)
    if (await this.schema.hasTable(this.tableName)) {
      this.schema.dropTable(this.tableName)
    }

    // Create the table with the updated schema
    this.schema.createTable(this.tableName, (table) => {
      table.integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')

      // New columns for kick functionality
      table.integer('kicks').defaultTo(0).notNullable()
      table.boolean('is_kicked').defaultTo(false).notNullable()
      table.integer('kicked_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      // Add unique constraint
      table.unique(['user_id', 'channel_id'])

      // Timestamps
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  public async down() {
    // Drop the table on rollback
    this.schema.dropTableIfExists(this.tableName)
  }
}
