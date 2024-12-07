import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'channels'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 255).notNullable().unique()
      table.integer('owner_id').unsigned().notNullable()
      table.boolean('is_private').defaultTo(false)
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })

    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        id: -1,
        name: 'general',
        owner_id: -1,
        is_private: false,
        created_at: new Date(),
        updated_at: new Date()
      })
    })
  }



  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
