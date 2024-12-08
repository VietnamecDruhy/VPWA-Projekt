import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'banned_users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('channel_id').unsigned().references('id').inTable('channels').onDelete('CASCADE')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      // Compound unique to prevent duplicate bans
      table.unique(['channel_id', 'user_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}