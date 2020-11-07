import dotenv from 'dotenv';
import Discord from 'discord.js';
import fs from 'fs';
import * as Utils from './utils/utils.mjs';
import * as GuildUtils from './utils/guilds.mjs';
import voiceCtl from './commands/join.mjs';

dotenv.config();

const client = new Discord.Client({
    autoReconnect: true
});
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.mjs'));

commandFiles.forEach(async (file) => {
    let commandObj = await import(`./commands/${file}`);
    let command = commandObj.default;
    
    client.commands.set(command.name, command);
    console.log(`Registered Command - ${command.name}`);

    if(command.aliases) {
        command.aliases.forEach(alias => {
            client.aliases.set(alias, command)
        });
    };
});

client.on('ready', async () => {
    console.log(`Bot has Started`);

    var prefix = process.env.DEFAULT_PREFIX;
    client.user.setActivity("AzuraCast! " + prefix + "help to get started.", { type: "LISTENING" });

    let guildData = GuildUtils.loadGuildData();
    guildData.forEach(serverData => {
        if(!serverData.home) return;

        voiceCtl.execute(client, serverData, "botHomeRoom");
    })
});

client.on('guildDelete', (guild) => {
    console.log(`The bot was removed from guild: ${guild.name} (${guild.id})`)
})

client.on('guildCreate', (guild) => {
    GuildUtils.getForGuild(guild);
    
    return console.log(`The bot was added to: ${guild.name} (${guild.id})`);
})

client.on('message', ( message ) => {
    let serverData = GuildUtils.getForGuild(message.guild);

    var prefix = process.env.DEFAULT_PREFIX;
    if(serverData.prefix) prefix = serverData.prefix;
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if(!client.commands.has(commandName) && !client.aliases.has(commandName)) {
        return;
    } else {
        const cmd = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        try {
            if(!serverData) return message.reply("🚫 - Oh no! There's been an issue while setting up! Please run `/settings init`");
            
            var serverCommands = serverData.commands;

            if(serverCommands[commandName]) {
                var command = serverCommands[commandName];

                if(!message.channel.permissionsFor(message.member).has('MANAGE_GUILD') || !message.channel.permissionsFor(message.member).has('ADMINISTRATOR')) {
                    if(command.private !== true) {
                        if(command.enabled === false) return message.reply("❌ - This command is disabled.");
                        if(command.type === 'role') {
                            if(!message.member.roles.cache.has(command.id)) return message.reply("❌ - Oh No! You've not got permission to use that!");
                        } else if (command.type === 'user') {
                            if(message.author.id !== command.id) return message.reply("❌ - Oh No! You've not got permission to use that!")
                        } else if (command.type === 'permission') {
                            console.log(message.channel.permissionsFor(message.member).has(command.permission))
                            console.log(command.permission)
                            if(message.channel.permissionsFor(message.member).has(command.permission)) return message.reply("❌ - Oh No! You've not got permission to use that!")
                        }
                    } 
                }
            }

            cmd.execute(client, serverData, message, args);
        } catch (error) {
            Utils.logError(new Date(), error);
            message.reply(`🚫 - Oops! Something went wrong. Please contact Ninja#4321 with reference \`${new Date()}\``);
        }
    }
});

client.login(process.env.BOT_TOKEN);