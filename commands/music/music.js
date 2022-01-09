const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const config = require("../../data/config.json");
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

const queue = new Map();
let songLength = 0;
const cookie = '__Secure-3PSID=DAhlvMy5tNHj7_Sp4SekjmP5yCL47IspjYf5U1ZYw7W4e9-gGXnGBkD6fIm7BoZFtA0TlQ.;';

module.exports = class Music extends Command {
	constructor(client) {
		super(client, {
			name: 'mus',
			group: 'music',
			memberName: 'mus',
			description: `Type ${config.prefix}music "youtube link" to start playing a youtube video`,
			guildOnly: true,
			//1 second cooldown for commands
			throttling: {
				usages: 1,
				duration: 1,
			},
			args: [
				{
					key: 'command',
					prompt: 'play, stop, or skip',
					type: 'string',
				},
				{
					key: 'url',
					prompt: 'Enter URL',
					type: 'string',
					default: '',
				},
			]
		});
	}

	async run(msg, { command, url }) {
		// msg = msg.toLowerCase();
		// command = command.toLowerCase();
		const serverQueue = queue.get(msg.guild.id);
		if (command.startsWith(`play`)) {
			execute(msg, serverQueue, url, this.client.user);
			return;
		}
		else if (command.startsWith(`skip`)) {
			skip(msg, serverQueue, this.client);
			return;
		} else if (command.startsWith(`stop`)) {
			stop(msg, serverQueue);
			return;
		} else if (command.startsWith(`queue`)) {
			readQueue(msg);
		} else if (command.startsWith(`length`)) {
			readLength(msg);
		} else {
			msg.channel.send("You need to enter a valid command!");
		}
	}
};

function formatSecondsToTime(sec) {
	res = "";
	if (!isNaN(sec)) {
		num = parseInt(sec);
		res += Math.floor((num / 60)).toString() + ":";
		if ((num % 60) < 10) {
				res += "0";
		}
		res += (num % 60).toString();
	} else {
		res = sec;
	}
	return res;
}

function readLength(msg) {
	const serverQueue = queue.get(msg.guild.id);
	
	if (!serverQueue) {
		msg.channel.send(`No songs playing`);
		return;
	}
	
	msg.channel.send(formatSecondsToTime(songLength) + " Remaining")
	.then( (msg) => {

		setTimeout(function editmsg () {
			if (songLength >= 0) {
				msg.edit(formatSecondsToTime(songLength) + " Remaining");
				setTimeout(editmsg, 1000);
				return;
			}
		}, 1000)
	});
}

function readQueue(message) {
	const serverQueue = queue.get(message.guild.id);
	if (!serverQueue) {
		message.channel.send(`No songs in queue`);
	} else {
		let songList = "";
		let songDuration = "";
		for (let song of serverQueue.songs) {
			songList += song.title + '\n';
			song.duration = formatSecondsToTime(song.duration);
			songDuration += song.duration + "\n"
		}
		message.channel.send(new MessageEmbed()
		.setColor(0x00AE86)
		.setTitle("Song Queue")
		.addFields(
			{name: `Songs`,value: `${songList}`, inline: true}, 
			{name: `Length`,value: `${songDuration}`, inline: true},
			)
		)
	}
}

async function execute(message, serverQueue, url, user) {
	try {
		const voiceChannel = message.member.voice.channel;
		if (!voiceChannel)
			return message.channel.send(
				"You need to be in a voice channel to play music!"
			);
		const permissions = voiceChannel.permissionsFor(message.client.user);
		if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
			return message.channel.send(
				"I need the permissions to join and speak in your voice channel!"
			);
		}

		let songInfo;
		let song;
		let options = {
			limit: 1,
			// requestOptions: {
			// 	headers: {
			// 	  cookie: cookie,
			// 	  //'x-youtube-identity-token': ""
			// 	  'authorization': 'SAPISIDHASH 1634268761_e4c9501ba25a2a51f85244af2704c874d8215c89',
			// 	  'X-Youtube-Identity-Token': 'QUFFLUhqbkQ1RHBLRzB0Tm9vYXJQMVZ3X0ZfOXRnRklsZ3w=',
			// 	}
			// },
			filter: "audioonly",
            // passes: 3,
            // highWaterMark: 1 << 27

		}
		try {
			if (ytdl.validateURL(url)) {
				// if (!url.includes("youtube")) {
				// 	return message.say("Link must be from youtube");
				// }
				songInfo = await ytdl.getInfo(url, options);
				song = {
					title: songInfo.videoDetails.title,
					url: songInfo.videoDetails.video_url,
					duration: songInfo.videoDetails.lengthSeconds,
				};
			} else {
				songInfo = await ytsr(url, options);
				console.log(options);
				song = {
					title: songInfo.items[0].title,
					url: songInfo.items[0].url,
					duration: songInfo.items[0].duration
				};
				console.log(song);
			}
		} catch (err) {
			if (serverQueue) {
				serverQueue.connection.dispatcher.end();
			}
			console.log(err);
			return message.say("No video id found");
		}

		if (!serverQueue) {
			const queueConstruct = {
				textChannel: message.channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 5,
				playing: true
			};

			queue.set(message.guild.id, queueConstruct);
			queueConstruct.songs.push(song);

			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(message.guild, queueConstruct.songs[0], user);

		} else {
			serverQueue.songs.push(song);
			return message.channel.send(`${song.title} has been added to the queue!`);
		}

	} catch (err) {
		if (serverQueue) {
			serverQueue.songs = [];
			queue.delete(message.guild.id);
			serverQueue.connection.dispatcher.end();
		}
		console.log(err);
		return message.say("bot broke");
	}
}

function skip(message, serverQueue) {
	if (!message.member.voice.channel)
		return message.channel.send("You have to be in a voice channel to stop the music!");
	if (!serverQueue)
		return message.channel.send("There is no song that I could skip!");
	serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
	if (!message.member.voice.channel)
		return message.channel.send(
			"You have to be in a voice channel to stop the music!"
		);

	if (!serverQueue)
		return message.channel.send("There is no song that I could stop!");

	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
}

function play(guild, song, user) {
	const serverQueue = queue.get(guild.id);
	if (!song) {
		serverQueue.voiceChannel.leave();
		// user.setActivity("bruh");
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection
		.play(ytdl(song.url, {
			filter: function (format) {
				if (format.audioBitrate) {
					return true;
				}
			}
		}
		))
		.on("start", () => {
			// function formatTimeToSec(time) {
			// 	if (isNaN(time)) {
			// 		time = time.split(':');
			// 		min = parseInt(time[0]) * 60;
			// 		sec = parseInt(time[1]);
			// 		return min + sec;
			// 	} else {
			// 		return time;
			// 	}
			// }

			// songLength = formatTimeToSec(song.duration);
			// setInterval(counter, 1000);
			// function counter () {
			// 	songLength--;
			// 	if (songLength <= 0) {
			// 		clearInterval(counter);
			// 	}
			// }
		})
		.on("finish", () => {
			serverQueue.songs.shift();
			user.setActivity("bruh");
			play(guild, serverQueue.songs[0], user);
		})
		.on("error", error => {
			console.log(error);
			serverQueue.textChannel.send(`Can't play: **${song.title}**`);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		});
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Start playing: **${song.title}**`);
	user.setActivity(`${song.title}`);
}