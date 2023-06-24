const { RegisterBehavior } = require('@sapphire/framework');
const { Subcommand } = require('@sapphire/plugin-subcommands');
const { PermissionsBitField } = require('discord.js'); 
const { createAudioPlayer, AudioPlayerStatus, createAudioResource, joinVoiceChannel, getVoiceConnection, entersState, VoiceConnectionStatus } =  require("@discordjs/voice");
const process = require("../../../config.json");
const { Time } = require('@sapphire/time-utilities');
const { stream, video_basic_info, yt_validate, search, stream_from_info } = require('play-dl');
const { client, getMethods} = require('../../index.js');
const { disposeAudioPlayer, log } = require('../../util.js');
const { useMasterPlayer } = require('discord-player');
const fs = require('fs/promises');

const player = useMasterPlayer();

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
            			.setName('search')
						.setDescription('search song')
						.addStringOption((option) =>
              				option.setName('search').setDescription('Youtube search query').setRequired(true)
            			)
				),
				{ 
					idHints: ['1099589111704207420'],
					behaviorWhenNotIdentical: RegisterBehavior.LogToConsole,
					guildIds: process.env.guildIDs
				}
		);
	}

	async chatInputRun(interaction) {
		await interaction.deferReply();
		// const serverQueue = queue.get(interaction.guildId);
		execute(interaction);
		return;
	}
};

async function execute(interaction) {

	try {

		let voiceChannel = client.channels.cache.find(x => x.name === 'test').voiceStates;
		console.log("voiceChannel", voiceChannel);
		
		// voiceChannel = interaction.member.voice.channel;
		// if (!voiceChannel)
		// 	return interaction.reply(
		// 		"You need to be in a voice channel to play music!"
		// 	);

		// const botPermissions = voiceChannel.permissionsFor(interaction.client.user);
		// if (!botPermissions.has(PermissionsBitField.Flags.Connect) || !PermissionsBitField.Flags.Speak) {
		// 		return interaction.editReply(
		// 		"I need the permissions to join and speak in your voice channel!"
		// 	);
		// }

		try {
			const query = interaction.options._hoistedOptions[0].value;

			const { track } = await player.play(voiceChannel, query, {
				nodeOptions: {
					// nodeOptions are the options for guild node (aka your queue in simple word)
					metadata: interaction, // we can access this metadata object using queue.metadata later on
					leaveOnEmpty: false,
				},
			});

			player.events.on('playerStart', (queue, track) => {
				// Emitted when the player starts to play a song
				queue.metadata.send(`Playing: **${track.title}**\n${track.url}`);
			});
			 
			player.events.on('audioTrackAdd', (queue, track) => {
				// Emitted when the player adds a single song to its queue
				queue.metadata.send(`**${track.title}** has been added to the queue!\n${track.url}`);
			});
			return;

		} catch (err) {
			console.log("err:",err);
			return interaction.followUp("Error finding song");
		}

	} catch(err) {
		interaction.followUp("bot broke");
		console.log(err);
	}
}