const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
// const process = require("../../config.json"); //comment when pushing to heroku.
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const fs = require('fs');

const queue = new Map();
const serverSettings = {"guild": []};

module.exports = class Music extends Command {
	constructor(client) {
		super(client, {
			name: 'mus',
			group: 'music',
			memberName: 'mus',
			description: `Type ${process.env.prefix}music "youtube link" to start playing a youtube video`,
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
			execute(msg, serverQueue, url);
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
		} else if (command.startsWith(`auto`)) {
			toggleAuto(msg);
		}
		else {
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

function addGuildToSettings(msg) {

	let newServerSettingsPush = {
		"name": msg.guild.name,
		"id": msg.guild.id,
		"auto": true
	}
	serverSettings.guild.push(newServerSettingsPush);
}

function toggleAuto(msg) {
	let guildObj = serverSettings.guild.find(o => o.id === msg.guild.id);
	let autoplay = false;
	
	if (guildObj) {
		//server in settings arr, replace auto value with opposite
		let index = serverSettings.guild.indexOf(guildObj);
		autoplay = !guildObj.auto;
		serverSettings.guild[index].auto = autoplay;
	} else {
		autoplay = true;
		addGuildToSettings(msg);
	}

	let str = autoplay ? "on" : "off";
	msg.channel.send(`Autoplay is now ${str}`);
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
				{ name: `Songs`, value: `${songList}`, inline: true },
				{ name: `Length`, value: `${songDuration}`, inline: true },
			)
		)
	}
}

async function getSongInfo(url, vidIndex) {
	let songInfo;
	let song;
	let options = {
		limit: 1,
		filter: "audioonly",
	}
	if (ytdl.validateURL(url)) {
		songInfo = await ytdl.getInfo(url, options);
		// console.log("ytdl: ",songInfo.related_videos);
		song = {
			title: songInfo.videoDetails.title,
			url: songInfo.videoDetails.video_url,
			duration: songInfo.videoDetails.lengthSeconds,
			nextSongId: songInfo.related_videos[vidIndex].id
		};
		// console.log(song);
	} else {
		songInfo = await ytsr(url, options);
		songInfo = await ytdl.getInfo(songInfo.items[0].url, options);
		// console.log("ytdl: ",songInfo.related_videos);
		song = {
			title: songInfo.videoDetails.title,
			url: songInfo.videoDetails.video_url,
			duration: songInfo.videoDetails.lengthSeconds,
			nextSongId: songInfo.related_videos[vidIndex].id
		};
	}
	return song;
}

async function execute(message, serverQueue, url) {
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

		try {
			song = await getSongInfo(url, 0);
		} catch (err) {
			if (serverQueue) {
				serverQueue.connection.dispatcher.end();
			}
			console.log(err);
			return message.say("No video id found");
		}

		let guildObj = serverSettings.guild.find(o => o.id === message.guild.id);
		
		if (!guildObj) {
			addGuildToSettings(message);
		}

		if (!serverQueue) {
			const queueConstruct = {
				textChannel: message.channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 5,
			};

			queue.set(message.guild.id, queueConstruct);
			queueConstruct.songs.push(song);

			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(message.guild, queueConstruct.songs[0], null);

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
	serverQueue.voiceChannel.leave();
	queue.delete(message.guild.id);
}

async function play(guild, song, nextSongId) {
	const serverQueue = queue.get(guild.id);
	let rand = Math.floor(Math.random() * 5);
	if (!song) {
		let guildObj = serverSettings.guild.find(o => o.id === guild.id);
		if (!guildObj.auto) {
			serverQueue.voiceChannel.leave();
			queue.delete(guild.id);
			return;
		} else {
			song = await getSongInfo("https://www.youtube.com/watch?v=" + nextSongId, rand);
		}
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
			
		})
		.on("finish", () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0], song.nextSongId, rand);
		})
		.on("error", error => {
			console.log(error);
			serverQueue.textChannel.send(`Can't play: **${song.title}**`);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0], song.nextSongId, rand);
		});
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}