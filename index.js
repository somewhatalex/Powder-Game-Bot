const Discord = require("discord.js");
const client = new Discord.Client();
const prefix = "!";
const { Permissions } = require('discord.js');
const getStats = require("./getUser");


//misc functions
function escapestring(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function randomnumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//do init tasks here
client.on("ready", () => {
  console.log("ok")
  //set username
  client.user.setUsername("Powder Game Bot");

  //count users
  var serverlist = "";
  var count = 0;
  client.guilds.cache.forEach((guild) => {
      count += guild.memberCount;
  })
  //set status
  client.user.setActivity("stats with " + count + " users | !help", { type: "WATCHING"});
  setInterval(() => {
      client.user.setActivity("stats with " + count + " users | !help", { type: "WATCHING"});
  }, 10000);

});

//do when bot joins server
client.on("guildCreate", guild => {
  if(guild != null) {
    let defaultChannel = "";
    guild.channels.cache.forEach((channel) => {
      if(channel.name.toLowerCase().includes("general") || channel.name.toLowerCase().includes("welcome")) {
        if(channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
          defaultChannel = channel;
        }
      }
    });

    //defaultChannel will be the channel object that the bot first finds permissions for
    defaultChannel.send("Hello, and thanks for inviting the Powder Game Bot. This bot gives user stats and more for the Powder Games made by Dan-Ball (not affiliated with). Type `!help` for more info.");
  }
});

//on message
client.on("message", function(message) {
  try {
    if(!message.author.bot) {
    if (!message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    //general commands
    if (command === "ping") {
      const timeTaken = Math.abs(Date.now() - message.createdTimestamp);
      message.reply(` pong! \`${timeTaken}ms\``);
    //calc
    } else if (command === "user") {
      if(args[0] === "pg" && args[1]) {
        message.reply("getting stats...");
        getStats.stats("pg", encodeURI(args.slice(1).join(" ")), message);
      } else if (args[0] === "pg2" && args[1]) {
        message.reply("getting stats...");
        getStats.stats("pg2", encodeURI(args.slice(1).join(" ")), message);
      } else if (!args[1]) {
        message.reply("please specify a username to search for (in Powder Game and Powder Game 2)! Use `pg` or `pg2` to define which one. ex. `!user pg2 bob4koolest`");
      } else {
        message.reply("please only use `pg` or `pg2` (for Powder Game and Powder Game 2) when searching! ex. `!user pg2 bob4koolest`");
      }
    } else if (command === "stats") {
      var usercount = 0;
      client.guilds.cache.forEach((guild) => {
          usercount += guild.memberCount;
      })

      var latency = `${Math.round(client.ws.ping)}`;
      var lagstatus = "Unknown";
      if (latency < 150) {
        lagstatus = "Good";
      } else if (latency > 150 && latency < 300) {
        lagstatus = "OK";
      } else {
        lagstatus = "Poor";
      }

      const ggEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setAuthor("Powder Game Bot", "https://cdn.discordapp.com/attachments/250170730891706368/936465569329348648/pg-logo.png?size=256")
        .setThumbnail("https://cdn.discordapp.com/attachments/250170730891706368/936465569329348648/pg-logo.png?size=256")
        .addFields(
          { name: "Bot Stats", value: "Powder Game Bot is in **" + client.guilds.cache.size + "** servers with **" + usercount + "** users." },
          { name: ":satellite: API Latency (ping)", value: lagstatus + " | " + latency + "ms", inline: true }
        )
        .setDescription("A bot that gives stats and other stuff for Powder Game 1 and Powder Game 2 by Dan-Ball, meant for the Unofficial Powder Game Discord server.")
      message.reply(ggEmbed);
    } else if (command === "help") {
      const ggEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("Powder Game Bot Help")
        .setThumbnail("https://cdn.discordapp.com/attachments/250170730891706368/936465569329348648/pg-logo.png?size=256")
        .setDescription("A bot that gives stats and other stuff for Powder Game 1 and Powder Game 2 by Dan-Ball, meant for the Unofficial Powder Game Discord server.\n\n**Commands:**\n`!user [pg/pg2] [username]` Get stats for a user.\n`!ping` Gets ping.\n`!stats` Returns bot stats.\n`!help` Shows this message (cool, right?)")
        .setFooter(`Requested by @${message.author.username}`)
      message.reply(ggEmbed);
    }

    //ending
  } else if (message.guild == null && !message.author.bot) {
      const ggEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("Oops!")
        .setDescription("Looks like you're in a DM. Please [invite me to your server](https://discord.com/oauth2/authorize?client_id=750849327299166259&scope=bot&permissions=8) to use me!")
      message.reply(ggEmbed);
  }
  } catch(e) {
    const ggEmbed = new Discord.MessageEmbed()
      .setColor('#0099ff')
       .setTitle("Uh oh...")
      .setDescription("Looks like we hit an error with your command `" + message.content + "`. Please make sure you used the proper values. Error details:```" + e + "```")
    message.reply(ggEmbed);
    console.log(e);
  }
});

client.login(process.env.token);
