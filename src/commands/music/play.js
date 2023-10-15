const { RegisterBehavior } = require('@sapphire/framework');
const { Subcommand } = require('@sapphire/plugin-subcommands');
const { PermissionsBitField } = require('discord.js');
const process = require("../../../config.json");
const { Time } = require('@sapphire/time-utilities');
const { Logger } = require('../../util/Logger');
const { useMainPlayer } = require('discord-player');
const { showLyricsOnButtonClick } = require('../../util/MusicUtil');

// const logger = new Logger("log.txt");

const player = useMainPlayer();

/** Player Events */
player.events.on('playerStart', (queue, track) => {
	// Emitted when the player starts to play a song
	return showLyricsOnButtonClick(queue, track, `Playing: **${track.title}**\n${track.url}`);
});

player.events.on('audioTrackAdd', (queue, track) => {
	// Emitted when the player adds a single song to its queue
	return showLyricsOnButtonClick(queue, track, `**${track.title}** has been added to the queue!\n${track.url}`);
});

/** Player extractors */
async function loadExtractors() {
	await player.extractors.loadDefault();
}

loadExtractors();

module.exports = class Play extends Subcommand {
	constructor(context, options) {

		super(context, {
			...options,
			name: 'play',
			description: 'play',
			category: 'Music',
			chatInputCommand: {
				guildIds: process.env.guildIDs
			},
			cooldownDelay: Time.Second * 2,

			subcommand: [
				{
					name: 'search',
					chatInputRun: "searchWords",
					default: true,
					setRequired: true
				}
				// {
				// 	name: 'url',
				// 	chatInputRun: 'searchUrl',
				// },
				// {
				// 	name: 'debug',
				// 	chatInputRun: 'searchPlayList',
				// }
			]
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('play')
				.setDescription('play')
				.addSubcommand((command) =>
					command
						.setName('query')
						.setDescription('song query')
						.addStringOption((option) =>
							option.setName('query').setDescription('Youtube search query').setRequired(true)
						)
				),
			{
				idHints: [process.env.playIdHint],
				behaviorWhenNotIdentical: RegisterBehavior.LogToConsole,
				guildIds: process.env.guildIDs
			}
		);
	}

	async chatInputRun(interaction) {
		execute(interaction);
		return;
	}
};

async function execute(interaction) {
	await interaction.deferReply({ content: `**Finding song...**` });

	try {
		let voiceChannel = interaction.member.voice.channel;

		// voiceChannel = client.channels.cache.find(x => (x.type === 2 && x.guild.name === 'test_server')); //For Debugging

		if (!voiceChannel)
			return interaction.editReply(
				"You need to be in a voice channel to play music!"
			);

		const botPermissions = voiceChannel.permissionsFor(interaction.client.user);
		if (!botPermissions.has(PermissionsBitField.Flags.Connect) || !PermissionsBitField.Flags.Speak) {
			return interaction.editReply(
				"I need the permissions to join and speak in your voice channel!"
			);
		}

		try {
			const query = interaction.options.getString("query");
			
			await player.play(voiceChannel, query, {
				nodeOptions: {
					// nodeOptions are the options for guild node (aka your queue in simple word)
					metadata: interaction, // we can access this metadata object using queue.metadata later on
					leaveOnEmpty: false,

				},
			});

		} catch (err) {
			// console.log("err:",err);
			// logger.logErr(err);
			console.log("execute, query:", err);
			return interaction.editReply("Error finding song");
		}

	} catch (err) {
		interaction.editReply("bot broke");
		console.log("execute, voiceChannel:", err);
		// logger.logErr(err);
	}
}