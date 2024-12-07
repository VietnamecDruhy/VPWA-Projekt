import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'kicks'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Add foreign key references for users and channels
      table.integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('kicked_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('channel_id')
        .unsigned().references('id')
        .inTable('channels')
        .onDelete('CASCADE')

      // Timestamps for record keeping
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}