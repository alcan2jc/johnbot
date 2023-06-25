const { RegisterBehavior } = require('@sapphire/framework');
const { Subcommand } = require('@sapphire/plugin-subcommands');
const { PermissionsBitField } = require('discord.js'); 
const process = require("../../../config.json");
const { Time } = require('@sapphire/time-utilities');
const { client } = require('../../index.js');
const { useMasterPlayer } = require('discord-player');

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

	try {
		let voiceChannel = interaction.member.voice.channel;

		// voiceChannel = client.channels.cache.find(x => (x.type === 2 && x.guild.name === 'test_server')); //For Debugging

		if (!voiceChannel)
			return interaction.reply(
				"You need to be in a voice channel to play music!"
			);

		const botPermissions = voiceChannel.permissionsFor(interaction.client.user);
		if (!botPermissions.has(PermissionsBitField.Flags.Connect) || !PermissionsBitField.Flags.Speak) {
				return interaction.reply(
				"I need the permissions to join and speak in your voice channel!"
			);
		}
		
		try {
			interaction.deferReply("Finding song");
			const query = interaction.options.getString("query");

			await player.play(voiceChannel, query, {
				nodeOptions: {
					// nodeOptions are the options for guild node (aka your queue in simple word)
					metadata: interaction, // we can access this metadata object using queue.metadata later on
					leaveOnEmpty: false,
				},
			});

		} catch (err) {
			console.log("err:",err);
			return interaction.editReply("Error finding song");
		}

	} catch(err) {
		interaction.editReply("bot broke");
		console.log(err);
	}
}