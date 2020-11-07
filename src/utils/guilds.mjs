import fs from 'fs';

export function loadGuildData () {
    return JSON.parse(fs.readFileSync('./persist/guilds.json'));
}

export function getForGuild (guild) {
    let guildData = loadGuildData();

    let serverData = guildData.find(serv => serv.id === guild.id);
    if (serverData) {
        return serverData;
    }

    serverData = {
        "id": `${guild.id}`,
        "timezone": "ETC/UTC",
        "locale": "en",
        "home": null,
        "url": null,
        "api": null,
        "commands": {}
    }

    guildData.push(serverData);
    fs.writeFileSync('./persist/guilds.json', JSON.stringify(guildData), (err) => {
        if (err) console.log(err);
    });

    return serverData;
}

export function writeForGuild (serverData) {
    let guildData = loadGuildData();
    guildData.forEach((data, id) => {
        if(data.id === serverData.id) {
            guildData[id] = serverData;
        }
    });

    fs.writeFile('./persist/guilds.json', JSON.stringify(guildsData), (err, data) => {
        if (err) { 
            console.error(err);
        };
    });
};