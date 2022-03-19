import dotenv from "dotenv";
import Discord from "discord.js";
import axios from "axios";
import fs from "fs";
import * as Utils from "./utils/utils.mjs";
import * as GuildUtils from "./utils/guilds.mjs";
import voiceCtl from "./commands/join.mjs";

dotenv.config();
let intents = new Discord.Intents(32767);
const client = new Discord.Client({
  autoReconnect: true,
  intents,
});
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".mjs"));

commandFiles.forEach(async (file) => {
  let commandObj = await import(`./commands/${file}`);
  let command = commandObj.default;

  client.commands.set(command.name, command);
  console.log(`Registered Command - ${command.name}`);

  if (command.aliases) {
    command.aliases.forEach((alias) => {
      client.aliases.set(alias, command);
    });
  }
});

client.on("ready", async () => {
  console.log(`Bot has Started`);

  await setInterval(updateChannel, 20000);

  const prefix = process.env.DEFAULT_PREFIX;
  let activityMessage = process.env.STATUS_MESSAGE.replace("{prefix}", prefix);
  let activityType = process.env.ACTIVITY_TYPE;
  let statusType = process.env.STATUS_TYPE;
  client.user.setActivity(activityMessage, { type: activityType });
  if (statusType) client.user.setStatus(statusType);

  let guildData = GuildUtils.loadGuildData();

  guildData.forEach((serverData) => {
    if (!serverData.home) return;

    voiceCtl.execute(client, serverData, "botHomeRoom");
  });
});

client.on("guildDelete", (guild) => {
  console.log(`The bot was removed from guild: ${guild.name} (${guild.id})`);
});

client.on("guildCreate", (guild) => {
  GuildUtils.getForGuild(guild);

  return console.log(`The bot was added to: ${guild.name} (${guild.id})`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (!message.guild)
    return message.channel.send("⚠ - Sorry my DM's are closed!");

  let serverData = GuildUtils.getForGuild(message.guild);

  let prefix = process.env.DEFAULT_PREFIX;
  if (serverData.prefix) prefix = serverData.prefix;
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (!client.commands.has(commandName) && !client.aliases.has(commandName)) {
    return;
  } else {
    const cmd =
      client.commands.get(commandName) ||
      client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName)
      );

    try {
      let serverCommands = serverData.commands;

      if (serverCommands[commandName]) {
        let command = serverCommands[commandName];

        if (
          !message.channel.permissionsFor(message.member).has("MANAGE_GUILD") ||
          !message.channel.permissionsFor(message.member).has("ADMINISTRATOR")
        ) {
          if (command.private !== true) {
            if (command.enabled === false)
              return message.channel.send("❌ - This command is disabled.");
            if (command.type === "role") {
              if (!message.member.roles.cache.has(command.id))
                return message.channel.send(
                  "❌ - Oh No! You've not got permission to use that!"
                );
            } else if (command.type === "user") {
              if (message.author.id !== command.id)
                return message.channel.send(
                  "❌ - Oh No! You've not got permission to use that!"
                );
            } else if (command.type === "permission") {
              console.log(
                message.channel
                  .permissionsFor(message.member)
                  .has(command.permission)
              );
              console.log(command.permission);
              if (
                message.channel
                  .permissionsFor(message.member)
                  .has(command.permission)
              )
                return message.channel.send(
                  "❌ - Oh No! You've not got permission to use that!"
                );
            }
          }
        }
      }

      cmd.execute(client, serverData, message, args);
    } catch (error) {
      Utils.logError(new Date(), error);
      message.channel.send(
        `🚫 - Oops! Something went wrong. Please contact Ninja#4321 with reference \`${new Date()}\``
      );
    }
  }
});

global.sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

client.login(process.env.BOT_TOKEN);

// Channel Topic Update!

async function updateChannel() {
  let guild = await client.guilds.fetch(process.env.GUILD_ID);
  let channel = await guild.channels.fetch(process.env.CHANNEL_ID);

  await axios.get(`${process.env.API_URL}/nowplaying/${process.env.STATION_ID}`)
    .then((response) => {
      let status = response.status;
      let data = response.data;

      if (status !== 200) {
        console.log(`\x1b[31m[ERROR]\x1b[0m Unable to update channel topic. ERR: ${data.message}`);
      } else {
        channel.setTopic(`${data.now_playing.song.artist} - ${data.now_playing.song.title}`)
          .then(() => {
            console.log(`\x1b[32m[INFO]\x1b[0m Updated channel topic.`);
          })
          .catch((error) => {
            console.log(`\x1b[31m[ERROR]\x1b[0m Unable to update channel topic. ERR: ${error}`);
          });
      }

    })
    .catch((error) => {
      Utils.logError(new Date(), error);
    });
}
