import { DateTime } from "luxon";
import { BaseModel, BelongsTo, belongsTo, column } from "@ioc:Adonis/Lucid/Orm";
import User from "App/Models/User";
import Channel from "App/Models/Channel";

export default class Message extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column({ columnName: 'user_id' })
  public userId: number;

  @column({ columnName: 'channel_id' })
  public channelId: number;

  @column({ columnName: 'message' })
  public content: string;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @belongsTo(() => User, {
    foreignKey: "userId",
  })
  public author: BelongsTo<typeof User>;

  @belongsTo(() => Channel, {
    foreignKey: "channelId",
  })
  public channel: BelongsTo<typeof Channel>;
}