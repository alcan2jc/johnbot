const fs = require("fs");
const config = require("D:\\Projects\\DiscordBots\\JohnBot\\johnbot\\data\\config.json");
const commando = require('discord.js-commando');
const { Guild } = require("discord.js");

//const client = new Discord.Client();

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
	
	if (msg.author.username === "meghan_who?") {
		console.log(msg.author.username, msg.author.id);
	}

	//Ignores all bots
	if (msg.author.bot) {
		return;
	}

	if (msg.content.includes(config.botID)) {
		msg.channel.send("Shut up");
	}

	let chance = Math.floor(Math.random() * 15 + 1);
	//let chance = 1;
	if (chance === 1 && msg.guild.name === 'CPE Bitch Chat') {
		let name = "";
		switch (msg.author.id) {
			case config.myID:
				name = "John";
				break;
			case config.jonID:
				name = "Jonathan";
				break;
			case config.richieID:
				name = "Richie";
				break;
			case config.pabloID:
				name = "Pablo";
				break;
			case config.nashinID:
				name = "Nashin";
				break;
			case config.meganID:
				msg.channel.send("Its been a while");
				break;
			case config.hansID:
				name = "Hans";
				break;
			default:
				name = "bro";
				break;
		}
		if (msg.author.id != config.meghanID) {
			msg.channel.send("I didnt knew that " + name);
		}
		
	}

	// const args = message.content.slice(prefix.length).split(/ +/);
	// const command = args.shift().toLowerCase();

});

client.login(config.token);