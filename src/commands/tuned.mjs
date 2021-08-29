import axios from "axios";
import * as L from "../locale/locales.mjs";

export default {
  name: "tuned",
  aliases: ["listeners", "listenercount", "stationinfo"],
  description: L._U("en", "desc_tuned"),
  private: false,
  execute: async (client, guildData, message, ...args) => {
    if (!message.guild)
      return message.channel.send(L._U(guildData.locale, "server_only"));

    axios
      .get("https://stream.micmusicradio.be/api/nowplaying_static/micmusicradio.json")
      .then((res) => {
        message.channel.send(
          `${L._U(guildData.locale, "currently")} **${
            res.data.station.name
          }** ${L._U(guildData.locale, "has")} **${
            res.data.listeners.unique
          }** ${L._U(guildData.locale, "unique_listeners")}`
        );
      })
      .catch((err) => {
        console.log(err);
        message.channel.send(L._U(guildData.locale, "http_error"));
      });
  },
};
