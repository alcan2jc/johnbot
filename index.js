const commando = require('discord.js-commando');
const process = require("./config.json");

//const client = new Discord.Client();
const client = new commando.Client();

client.commandPrefix = '$';
client.unknownCommandResponse = false;
client.registry.registerGroup("games", "Games");
client.registry.registerGroup("music", "Music");
client.registry.registerDefaults();
client.registry.registerCommandsIn(__dirname + "/commands");


client.on('ready', () => {
	console.log('Bot is now connected');
	client.user.setActivity("bruh");
	client.channels.cache.find(x => x.name === 'test').send('ready');
});

client.on('message', (msg) => {

	//Ignores all bots
	if (msg.author.bot) {
		return;
	}
});
client.login(process.env.token);
