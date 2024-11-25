import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AlterChannels extends BaseSchema {
  protected tableName = 'channels'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name').unique().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name').alter()
    })
  }
}