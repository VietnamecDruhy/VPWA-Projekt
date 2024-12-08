// commands/ChannelCleanup.ts
import { BaseCommand } from '@adonisjs/core/build/standalone'
import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon'

export default class ChannelCleanup extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'channel:cleanup'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'Delete channels that have been inactive for more than 30 days'

  public async run() {
    this.logger.info('Starting channel cleanup process...')

    try {
      // Find channels with last message older than 30 days
      const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toSQL()

      const channelsToDelete = await Database
        .from('channels')
        .select('channels.id', 'channels.name')
        .leftJoin('messages', 'channels.id', 'messages.channel_id')
        .whereNotNull('messages.id')  // Only channels with messages
        .groupBy('channels.id')
        .havingRaw('MAX(messages.created_at) < ?', [thirtyDaysAgo])

      if (channelsToDelete.length === 0) {
        this.logger.info('No inactive channels found')
        return
      }

      // Delete channels - cascading will handle related records
      for (const channel of channelsToDelete) {
        await Database
          .from('channels')
          .where('id', channel.id)
          .delete()

        this.logger.info(`Deleted inactive channel: ${channel.name}`)
      }

      this.logger.success(`Successfully cleaned up ${channelsToDelete.length} inactive channels`)
    } catch (error) {
      this.logger.error('Error during channel cleanup:', error)
      throw error
    }
  }
}