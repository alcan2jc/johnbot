const { LogLevel, SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits, REST, Routes } = require('discord.js');
const process  = require('../config.json');
const { Player } = require('discord-player');
const { showLyricsOnButtonClick } = require('../src/util/MusicUtil');

const client = new SapphireClient ({
	// logger: {
	// 	level: LogLevel.Debug
	// },
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	],
	loadMessageCommandListeners: true, 
});

client.on('ready', () => {
	console.log('Bot is now connected');
	client.user.setActivity("bruh");
	client.channels.cache.find(x => x.name === 'test').send('ready');
});

client.login(process.env.token);

const player = Player.singleton(client, {
	ytdlOptions: {
		requestOptions: {
			headers: {
				cookie: process.env.COOKIES
			}
		}
	}
});

player.events.on('playerStart', (queue, track) => {
	// Emitted when the player starts to play a song
	return showLyricsOnButtonClick(queue, track, `Playing: **${track.title}**\n${track.url}`);
});
 
player.events.on('audioTrackAdd', (queue, track) => {
	// Emitted when the player adds a single song to its queue
	return showLyricsOnButtonClick(queue, track, `**${track.title}** has been added to the queue!\n${track.url}`);
});

async function loadExtractors() {
	await player.extractors.loadDefault();
}

loadExtractors();

function deleteAllCommands() {
	for (let guildId in process.env.guildIDs) {
		rest.delete(Routes.applicationGuildCommand(process.env.clientID, guildId, { body: [] }))
			.then(() => console.log('Successfully deleted guild command'))
			.catch(console.error);
	}

	// for global commands
	rest.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);
}

function deleteCommand(commandId) {
	const rest = new REST().setToken(process.env.token);

	for (let guildId in process.env.guildIDs) {
		rest.delete(Routes.applicationGuildCommand(process.env.clientID, guildId, commandId))
			.then(() => console.log('Successfully deleted guild command'))
			.catch(console.error);
	}
	// for global commands
	rest.delete(Routes.applicationCommand(process.env.clientID, commandId))
		.then(() => console.log('Successfully deleted application command'))
		.catch(console.error);
}

module.exports = { client };