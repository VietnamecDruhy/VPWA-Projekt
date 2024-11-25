import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AlterChannels extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('nickname').unique().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('nickname').alter()
    })
  }
}