const fs = require("fs");
const config = require("D:\\Projects\\DiscordBots\\JohnBot\\johnbot\\data\\config.json");
const commando = require('discord.js-commando');
const { Guild } = require("discord.js");

const client = new commando.Client();
client.commandPrefix = '$';
client.unknownCommandResponse = false;
client.registry.registerGroup("games", "Games");
//client.registry.registerGroup("general", "General");
client.registry.registerGroup("music", "Music");
client.registry.registerDefaults();
client.registry.registerCommandsIn(__dirname + "/commands");


client.on('ready', () => {
	console.log('Bot is now connected');
	client.user.setActivity("Moo");
	client.channels.cache.find(x => x.name === 'test').send('ready');
});

client.on('message', (msg) => {
	//console.log(msg);

	//Ignores all bots
	if (msg.author.bot) {
		return;
	}

	if (msg.content.includes(config.botID)) {
		msg.channel.send("Shut up");
	}

});

client.login(config.token);