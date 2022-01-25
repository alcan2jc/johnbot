const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const categories = require("./hangmanData/categories.json");
const leaderboard = require("./hangmanData/leaderboard.json");
const process = require("../../config.json");
const fs = require('fs');

var state = 1;
const stateEnum = Object.freeze({
	IDLE: 1,
	SETUP: 2,
	WAIT: 3,
	GUESS: 4,
})

//timer variables
const startTime = '120000';
const guessTime = '20000';
var guessfilter = m => !m.author.bot && m.content.includes(`${process.env.prefix}hm `) && m.author.id == currentPlayers[playerIndex].id;

//initialize variables
var displayedWord = ""; //The displayed word 
var actualWord = ""; //The actual word 
var currentPlayers = []; //The players in the game
var playerIndex = 0; //Index of the player currently playing
var goodGuesses = []; //List of correct letter guesses
var badGuesses = []; //List of incorrect letter guesses
var topic = "";
var gameOver = false;
var timeRanOut = true;

module.exports = class Hangman extends Command {
	constructor(client) {
		super(client, {
			name: 'hm',
			group: 'games',
			memberName: 'hm',
			description: `Starts a Hangman game. Type ${process.env.prefix}hm play to start playing`,
			guildOnly: true,
			//1 second cooldown for commands
			throttling: {
				usages: 1,
				duration: 1,
			},
			argsType: 'single'
		});
	}

	run(msg, args) {
		args = args.toLowerCase();
		switch (state) {
			case stateEnum.IDLE:
				for (let i = 0; i < categories.Categories.length; i++) {
					//Check if a category was chosen
					if (args === categories.Categories[i].name.toLowerCase()) {
						//choose random word
						let rand = Math.floor(Math.random() * categories.Categories[i].words.length);
						actualWord = categories.Categories[i].words[rand].toLowerCase();
						topic = categories.Categories[i].name;
						state = stateEnum.SETUP;
					}
				}

				if (args === "leaderboard" || args === "leaderboards") {
					showLeaderboard(msg);
					break;
				}

				//if no category was chosen, or leaderboard command not sent, send the category list
				if (state === stateEnum.IDLE && args != "leaderboard") {
					showCategories(msg);
					break;
				}

			case stateEnum.SETUP:
				this.client.user.setActivity("Hangman");

				//automatically add msger to the game 
				let playerObj = {
					username: msg.author.username,
					id: msg.author.id,
					points: 0,
				};

				currentPlayers.push(playerObj);
				let startfilter = m => !m.author.bot && m.content === `${process.env.prefix}hm start`;
				let startCollector = msg.channel.createMessageCollector(startfilter, { time: startTime });

				startCollector.on('collect', (msg) => {
					if (msg.content === `${process.env.prefix}hm start`) {
						startCollector.stop();
					}
				});

				setupMessage(msg);

				//When time runs out
				startCollector.on('end', (collected) => {
					if (collected.size != 1) {
						msg.say("Game starting now!");
						currentPlayers = shuffle(currentPlayers);
						setupHangman(msg);
						drawHangman(msg);
						state = stateEnum.GUESS;
					}
				});
				state = stateEnum.WAIT;
				break;

			//Waits until game is started
			case stateEnum.WAIT:

				//To stop playing
				if (args === "game_stop") {
					//Stop all ongoing timers
					for (let i = 0; i < currentPlayers.length; i++) {
						currentPlayers[i].guessed = false;
					}
					this.client.user.setActivity("Moo");
					msg.say("Game has been Stopped");
					state = stateEnum.IDLE;
					updateLeaderboard();
					return;
				}
				//Display leaderboard
				else if (args === "leaderboard") {
					showLeaderboard(msg);
					return;
				}
				//To join the game
				else if (args === "join") {
					//Check if players is already in game
					let playerObj = {
						username: msg.author.username,
						id: msg.author.id,
						points: 0
					};
					for (let i = 0; i < currentPlayers.length; i++) {
						if (currentPlayers[i].id === msg.author.id) {
							msg.reply("You have already joined");
							setupMessage(msg);
							return;
						}

						//add player to the game 
						currentPlayers.push(playerObj);
						msg.reply("Has been added to the game!!");
						setupMessage(msg);
						return;
					}
				}
				//To start the game
				else if (args === "start") {
					//game is started
					for (let i = 0; i < currentPlayers.length; i++) {
						if (currentPlayers[i].id === msg.author.id) {
							state = stateEnum.GUESS;
							i = currentPlayers.length;
						}
					}

					//Cant start the game if you're not in the game
					if (state === stateEnum.WAIT) {
						msg.reply("You haven't joined! join to start playing");
						setupMessage(msg);
						return;
					}

					msg.say("Game starting now!");
					currentPlayers = shuffle(currentPlayers);
					setupHangman(msg);
					drawHangman(msg);
					playRound();

				} else {
					return;
				}

			//Guessing state
			case stateEnum.GUESS:

				function playRound() {

					displayedWord = displayedWord.toLowerCase();

					//Start the timer for current player. 
					const timer = msg.channel.createMessageCollector(guessfilter, { time: guessTime });
					timer.on('collect', (guess) => {
						guess = guess.content.substring(4, guess.length);
						guess = guess.toLowerCase();
						//To stop playing
						if (guess === "game_stop") {
							this.client.user.setActivity("Moo");
							msg.say("Game has been Stopped");
							state = stateEnum.IDLE;
							updateLeaderboard();
							return;
						}

						//To check leaderboard
						if (guess === "leaderboard") {
							showLeaderboard(msg);
							return;
						}

						//Check if letter/word has already been guessed. 
						if (goodGuesses.includes(guess) || badGuesses.includes(guess)) {
							msg.say(`${msg.author}, You already tried that. Try again!`);
							timeRanOut = false;
							timer.stop();
							return;
						}

						//player is guessing a word if guess has more than 1 letter
						if (guess.length > 1) {
							//Correct word guessed!
							if (guess === actualWord) {
								displayedWord = actualWord;
								currentPlayers[playerIndex].points += 5;
								msg.say(`You Win!!! ${msg.author} gained +5 points`);
								drawHangman(msg);
								updateLeaderboard();
								return;
							}

							//Wrong word guessed :(
							else {
								badGuesses.push(guess);
								msg.say(`${msg.author}, Wrong word guessed :(`);
							}
						} else { //player is guessing 1 letter
							let correctLetterIndex = [];
							for (let i = 0; i < actualWord.length; i++) {
								if (actualWord[i] === guess.toLowerCase()) {
									correctLetterIndex.push(i);
									goodGuesses.push(guess);
								}
							}

							//Player guessed correct letter! :D 
							if (correctLetterIndex.length > 0) {
								msg.say(`<@${currentPlayers[playerIndex].id}>, Correct letter guessed! gained +${correctLetterIndex.length} points`);
								//add points to msger
								currentPlayers[playerIndex].points += correctLetterIndex.length;
								//Put letter(s) into displayed word spot(s)
								correctLetterIndex.forEach(i => {
									displayedWord = displayedWord.substring(0, i) +
										actualWord[i] +
										displayedWord.substring(i + 1);
								});
							}

							//Player guessed wrong letter D:
							else {
								badGuesses.push(guess);
								msg.say(`<@${currentPlayers[playerIndex].id}>, Wrong letter guessed :(`);
							}
							timeRanOut = false;
							timer.stop();
						}

					});
					//When player doesn't guess
					timer.on('end', () => {
						if (!gameOver) {
							if (timeRanOut) {
								badGuesses.push("");
								msg.say(`<@${currentPlayers[playerIndex].id}> Took too long!`);
							}

							//Next player's turn
							if (playerIndex === currentPlayers.length - 1) { playerIndex = 0; } else { playerIndex++; }

							timeRanOut = true;
							drawHangman(msg);
							playRound();
						}
					});
				}
				break;

			//Should never reach this point
			default:
				msg.say("goof");
				break;
		}
		return;
	}
};

//Draws the initial hangman drawing
function setupHangman(msg) {
	for (let i = 0; i < actualWord.length; i++) {
		if (actualWord.charAt(i).match(/[a-zA-Z0-9]/i)) {
			displayedWord += '_';
		} else if (actualWord.charAt(i) !== ' ') {
			displayedWord += actualWord.charAt(i);
		} else {
			displayedWord += ' ';
		}
	}
}

//The message during the waiting period. 
function setupMessage(msg) {
	let tempPlayers = []; //array of player names
	for (let i = 0; i < currentPlayers.length; i++) {
		tempPlayers.push("<@" + currentPlayers[i].id + ">");
	}

	msg.say(new MessageEmbed()
		.setColor(0x00AE86)
		.setTitle(`Hangman Will Start Soon! The category is: ${topic}`)
		.addFields(
			{
				name: "Join",
				value: `To join the game: Type ${process.env.prefix}hm join`
			},
			{
				name: "Players",
				value: `${tempPlayers.join(', ')}`
			},
			{
				name: "How To Play",
				value: `Guess letter(s), word(s), or number(s) by typing ${process.env.prefix}hm (guess)`
			},
			{
				name: "Start",
				value: `To start the game: Type ${process.env.prefix}hm start`
			},
			{
				name: "Quit",
				value: `To stop playing: Type ${process.env.prefix}hm GAME_STOP`
			},
			{
				name: "Check Leaderboard",
				value: `Type ${process.env.prefix}hm leaderboard to check the leaderboard`
			},
			{
				name: "Plug",
				value: "Follow me on [Github](http://github.com/alcan2jc)"
			}))
	msg.say("Game will start automatically in 2 minutes!");
}

function showLeaderboard(msg) {
	let players = [];
	let points = [];
	for (let i = 0; i < leaderboard.Players.length; i++) {
		if (i < 10) {
			players.push(leaderboard.Players[i].username);
			points.push(leaderboard.Players[i].points);
		}
	}

	msg.say(new MessageEmbed()
		.setColor(0x00AE86)
		.setTitle(`Hangman Leaderboard`)
		.addFields(
			{
				name: "Top 10",
				value: `${players.join('\n')}`,
				inline: true
			},
			{
				name: "Points",
				value: `${points.join('\n')}`,
				inline: true
			}))
}

const updateLeaderboard = async () => {
	const delay = ms => new Promise(res => setTimeout(res, ms));
	await delay(5000);
	let newLeaderboard = leaderboard;
	let playerRegistered = false;
	//check if playerid is already in the json
	for (let i = 0; i < currentPlayers.length; i++) {
		for (let j = 0; j < newLeaderboard.Players.length; j++) {
			//add points to players already registered
			if (currentPlayers[i].id === newLeaderboard.Players[j].id) {
				newLeaderboard.Players[j].points += currentPlayers[i].points;
				playerRegistered = true;
			}
		}

		//Register new player to leaderboard
		if (!playerRegistered) {
			newLeaderboard.Players.push(currentPlayers[i]);
		} else {
			playerRegistered = false;
		}
	}

	//Put leaderboard in descedning order by points
	var byPoints = newLeaderboard.Players.slice(0);
	byPoints.sort(function (a, b) {
		return b.points - a.points;
	});
	newLeaderboard = { Players: byPoints }

	//Write file to json
	fs.writeFile("./commands/games/hangmanData/leaderboard.json", JSON.stringify(newLeaderboard), err => {
		if (err) {
			msg.say("bot fucked");
			throw err;
		}
	})
}

//Helper function to randomize player order
function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain players to shuffle.
	while (0 !== currentIndex) {

		// Pick a remaining player.
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current player.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

//Shows the categories to be chosen
function showCategories(msg) {
	let listCats = "";
	for (let i = 0; i < categories.Categories.length; i++) {
		listCats += "• " + categories.Categories[i].name + "\n";
	}
	msg.say(`Type ${process.env.prefix}hm (category) to play`);
	msg.say(new MessageEmbed()
		.setColor(0x00AE86)
		.setTitle("Categories")
		.setDescription(`${listCats}`))
}

//Draws the Hangman game
function drawHangman(msg) {
	//print whoever's turn if game hasn't ended
	if (badGuesses.length < 6 && displayedWord != actualWord) {
		msg.say(`It is your turn: <@${currentPlayers[playerIndex].id}>`);
	}

	//Hangman drawing
	let drawing = '```\n';
	drawing += "  ________________\n" +
		"  |              |\n";

	let lines = 5; //Number of lines left to draw from the ground
	//Draw Head if needed
	if (badGuesses.length >= 1) {
		drawing += "  |              O\n";
		lines--;
	}

	//Draw Body\Arms if needed
	if (badGuesses.length === 2) { //Body
		drawing += "  |              |\n";
		lines--;
	} else if (badGuesses.length === 3) { //Left Arm
		drawing += "  |             /|\n";
		lines--;
	} else if (badGuesses.length >= 4) { //Left\Right Arm
		drawing += "  |             /|\\\n";
		lines--;
	}

	//Draw Legs if needed
	if (badGuesses.length === 5) { //Left Leg
		drawing += "  |             / \n";
		lines--;
	} else if (badGuesses.length >= 6) { //Left/Right Leg
		drawing += "  |             / \\\n";
		lines--;
	}

	for (let i = 0; i < lines; i++) {
		drawing += "  |                \n";
	}
	drawing += "\n";

	//win!
	if (displayedWord === actualWord) {
		state = stateEnum.STOP;
		gameOver = true;
		updateLeaderboard();
	}

	//lose
	if (badGuesses.length >= 6) {

		msg.say(`You all suck\n The correct word/phrase was ${actualWord}`);
		displayedWord = actualWord;
		state = stateEnum.STOP;
		gameOver = true;
		updateLeaderboard();
	}

	drawing += `\nWord: ${displayedWord.toUpperCase().split('').join(' ')}\        ` +
		`\nIncorrect Guesses: ${badGuesses.filter(word => word.length > 0)}` + ' \n';

	drawing += '```';

	//send the embedded drawing and message.
	msg.say(new MessageEmbed()
		.setColor(0x00AE86)
		.setTitle("Hangman")
		.addFields(
			{
				name: `Topic: ${topic}`,
				value: `${drawing}`,
				inline: true,
			}))
}
