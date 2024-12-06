import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Channel from 'App/Models/Channel'
import User from 'App/Models/User'

export default class ChannelSeeder extends BaseSeeder {
  public async run() {
    // Find or create admin user
    const admin = await User.firstOrCreate(
      { email: 'admin@admin.com' },
      {
        email: 'admin@admin.com',
        password: 'admin123',
        name: 'Admin',
        nickname: 'admin10'
      }
    )

    // Create general channel
    await Channel.firstOrCreate(
      { name: 'general' },
      {
        name: 'general',
        ownerId: admin.id,
        isPrivate: false
      }
    )
  }
}
