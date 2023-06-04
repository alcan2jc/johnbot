const { RegisterBehavior } = require('@sapphire/framework');
const { Subcommand } = require('@sapphire/plugin-subcommands');
const { PermissionsBitField } = require('discord.js'); 
const { createAudioPlayer, AudioPlayerStatus, createAudioResource, joinVoiceChannel, getVoiceConnection, entersState, VoiceConnectionStatus } =  require("@discordjs/voice");
const process = require("../../../config.json");
const { Time } = require('@sapphire/time-utilities');
const { stream, video_basic_info, yt_validate, search, stream_from_info } = require('play-dl');
const { queue, player, getMethods} = require('../../index.js');
const { disposeAudioPlayer, log } = require('../../util.js');

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
		const serverQueue = queue.get(interaction.guildId);
		execute(interaction, serverQueue);
		return;
	}
};

async function execute(interaction, serverQueue) {

	try {
		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel)
			return interaction.reply(
				"You need to be in a voice channel to play music!"
			);

		const botPermissions = voiceChannel.permissionsFor(interaction.client.user);
		if (!botPermissions.has(PermissionsBitField.Flags.Connect) || !PermissionsBitField.Flags.Speak) {
				return interaction.editReply(
				"I need the permissions to join and speak in your voice channel!"
			);
		}

		const queryOrUrl = interaction.options._hoistedOptions[0].value;

		try {
			const songInfo = await getSongInfo(queryOrUrl, interaction);

			if (!serverQueue) {
				const queueConstruct = {
					textChannel: interaction.channel,
					voiceChannel: voiceChannel,
					connection: null,
					songs: [],
					audioPlayer: createAudioPlayer(),
					volume: 5,
				};
	
				queue.set(interaction.guildId, queueConstruct);
				queueConstruct.songs.push(songInfo);
				const connection = joinVoiceChannel(
				{
					channelId: voiceChannel.id,
					guildId: interaction.guildId,
					adapterCreator: interaction.guild.voiceAdapterCreator,
					selfDeaf: false
				});

				queueConstruct.connection = connection;
				let vconnection = getVoiceConnection(interaction.guildId);
				
				if (vconnection === undefined) {
					return;
				}
				vconnection.subscribe(player);
				play(interaction, queueConstruct);
	
			} else {
				serverQueue.songs.push(songInfo);
				// play(interaction, serverQueue);
				return interaction.editReply(`**${songInfo.title}** has been added to the queue!\n${songInfo.url}`);
			}
		} catch (err) {
			console.log("err:",err);
			log(err);
			return interaction.editReply("Error finding song");
		}

	} catch(err) {
		interaction.editReply("bot broke");
		console.log(err);
		log(err);
	}
}

async function getSongInfo(queryOrUrl, interaction) {
	let songInfo;
	let song;

	try {
		if (queryOrUrl.startsWith('https') && yt_validate(queryOrUrl) === 'video') { //Youtube URL or ID
			songInfo = await video_basic_info(queryOrUrl);
			// playStream = await stream(queryOrUrl, options);
		} else { //Query
			// console.log("isQuery");
			let songInfoSearch = await search(queryOrUrl, { limit : 1 });
			songInfoSearch = songInfoSearch[0];
			if (songInfoSearch.url === null) {
				return interaction.editReply("No Songs Found")
			}
			console.log("video_basic_info");
			songInfo = await video_basic_info(songInfoSearch.url);
			console.log("stream");
			// playStream = await stream(songInfoSearch.url, options);
		}
	} catch (err) {
		console.log("getSongInfo:", err);
		log(err);
		return interaction.editReply("Error fetching song info");
	}

	song = {
		title: songInfo.video_details.title,
		url: songInfo.video_details.url,
		duration: songInfo.video_details.durationInSec
		// nextSongId: songInfo.related_videos[vidIndex].id
	};
	return song;
}

async function play(interaction, newServerQueue) {
	const song = newServerQueue.songs[0];
	const guild = interaction.guild;
	const serverQueue = queue.get(guild.id);
	try {
		let options = {
			quality: 2,
			language: "en-US",
			// discordPlayerCompatibility: true
		}
		if (!song || !stream) {
			if (serverQueue) {
				serverQueue.songs = [];
				disposeAudioPlayer(interaction.guildId);
				serverQueue.connection.destroy();
			}
			queue.delete(interaction.guildId);
			return
		}
		
		let playStream = await stream(song.url, options);
		let resource = createAudioResource(playStream.stream, { inputType: playStream.type });
		player.play(resource);

		const voiceConnection = newServerQueue.connection;
		const voiceChannel = interaction.member.voice.channel;
		try {
			await entersState(voiceConnection, VoiceConnectionStatus.Ready, 5000);
			console.log("Connected: " + voiceChannel.guild.name);
			// console.log(queueConstruct.textChannel);
		} catch (err) {
			console.log("Voice Connection not ready within 5s.", err);
			log(err);
			return interaction.editReply(`Bot Broke`);
		}
			
		player.once('error', (error) => console.error(error));

		player.once(AudioPlayerStatus.Playing, () => {
			console.log("playing")
			return interaction.editReply(`Playing: **${song.title}**\n${song.url}`);
		});

		player.once(AudioPlayerStatus.Paused, () => {
			console.log("Paused")
		});

		player.once(AudioPlayerStatus.Buffering, () => {
			console.log("Buffering")
		});
		
		player.once(AudioPlayerStatus.Idle, () => {
			console.log(`Idle`);
			// interaction.editReply(`Stopped playing: **${song.title}**`);
			try {
				player.stop();
				shiftServerQueue(serverQueue);
				play(interaction, serverQueue);
			} catch(err) {
				console.log("Idle:",err);
				log(err);
				return interaction.editReply(`Bot Broke`);
			}
		});
	} catch(err) {
		console.log("error in play(...): ", err);
		shiftServerQueue(serverQueue);
		play(interaction, serverQueue);
		return interaction.editReply(`Could not Play: **${song.title}**. Skipping`);
	}
}

function shiftServerQueue(serverQueue) {
	serverQueue.songs.shift();
}