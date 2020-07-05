const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const wordsObj = require("./hangmanData/hmwords.json");
const config = require("D:\\Projects\\DiscordBots\\JohnBot\\johnbot\\data\\config.json");
const categories = require("./hangmanData/categories.json");
var state = 1;

const stateEnum = Object.freeze({
	IDLE: 1,
	SETUP: 2,
	WAIT: 3,
	GUESS: 4,
})

//initialize variables
var displayedWord = ""; //The displayed word 
var actualWord = ""; //The actual word 
var currentPlayers = []; //The players in the game
var playerIndex = 0; //Index of the player currently playing
var goodGuesses = []; //List of correct letter guesses
var badGuesses = []; //List of incorrect letter guesses
var topic = "";
var started = false;

module.exports = class Hangman extends Command {
	constructor(client) {
		super(client, {
			name: 'hm',
			group: 'games',
			memberName: 'hm',
			description: `Starts a Hangman game. Type ${config.prefix}hm play to start playing`,
			guildOnly: true,
			//1 second cooldown for commands
			throttling: {
				usages: 1,
				duration: 1,
			},
			argsType: 'single'
		});
	}

	async run(msg, args) {
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

				//if no category was chosen, send the category list
				if (state === stateEnum.IDLE) {
					showCategories(msg);
					break;
				}

			case stateEnum.SETUP:
				//Declare Variables
				displayedWord = "";
				currentPlayers = [];
				playerIndex = 0;
				goodGuesses = [];
				badGuesses = [];
				started = false;

				this.client.user.setActivity("Hangman");

				//automatically add msger to the game 
				currentPlayers.push(msg.author);
				setupMessage(msg);
				state = stateEnum.WAIT;

			//Waits until game is started
			case stateEnum.WAIT:

				//To stop playing
				if (args === "game_stop") {
					msg.say("Game has been Stopped");
					state = stateEnum.IDLE;
					break;
				}

				//To join the game
				if (args === "join") {
					//Check if players is already in game
					if (currentPlayers.includes(msg.author)) {
						msg.reply("You have already joined");
						setupMessage(msg);
						break;
					//add player to the game 
					} else {
						currentPlayers.push(msg.author);
						msg.reply("Has been added to the game!!");
						setupMessage(msg);
						break;
					}

				//To start the game
				} else if (args === "start") {

					//Cant start the game if youre not in the game
					if (!currentPlayers.includes(msg.author)) {
						msg.reply("You haven't joined! join to start playing");
						setupMessage(msg);
						break;
					}

					msg.say("Game starting now!")
					currentPlayers = shuffle(currentPlayers);
					setupHangman(msg);
					drawHangman(msg);
					state = stateEnum.GUESS;
				} else {
					break;
				}
			//Guessing state
			case stateEnum.GUESS:

				//To stop playing
				if (args === "game_stop") {
					msg.say("Game has been Stopped");
					state = stateEnum.IDLE;
					break;
				}

				//case needed during the start of the game so that "start" is not counted as an arg
				if (!started) {
					started = true;
					break;
				}

				//At this point, don't do anything if its not msger's turn
				if (msg.author !== currentPlayers[playerIndex]) {
					break;
				}

				displayedWord = displayedWord.toLowerCase();
				//Check if letter/word has already been guessed. 
				if (goodGuesses.includes(args) || badGuesses.includes(args)) {
					msg.reply("You already tried that. Try again!");
					drawHangman(msg);
					break;
				}

				//player is guessing a word if guess has more than 1 letter
				if (args.length > 1) {
					//Correct word guessed!
					if (args === actualWord) {
						displayedWord = actualWord;
						state = stateEnum.IDLE
					}
					//Wrong word guessed :(
					else {
						badGuesses.push(args);
						msg.reply("Wrong word guessed :(");
					}
				}

				else { //player is guessing 1 letter
					let correctLetterIndex = [];
					for (let i = 0; i < actualWord.length; i++) {
						if (actualWord[i] === args.toLowerCase()) {
							correctLetterIndex.push(i);
							goodGuesses.push(args);
						}
					}

					//Player guessed correct letter! :D 
					if (correctLetterIndex.length > 0) {
						msg.reply("Correct letter guessed!");
						//Put letter(s) into displayed word spot(s)
						correctLetterIndex.forEach(i => {
							displayedWord = displayedWord.substring(0, i) +
								actualWord[i] +
								displayedWord.substring(i + 1);
						});

					}
					//Player guessed wrong letter D:
					else {
						badGuesses.push(args);
						msg.reply("Wrong letter guessed :(");
					}
				}

				//win!
				if (displayedWord === actualWord) {
					msg.say(`You Win!!!`);
					drawHangman(msg);
					this.client.user.setActivity("Moo");
					state = stateEnum.IDLE;
					break;
				}

				//lose
				if (badGuesses.length >= 6) {
					msg.say(`You all suck\n The correct word/phrase was ${actualWord}`);
					displayedWord = actualWord;
					drawHangman(msg);
					this.client.user.setActivity("Moo");
					state = stateEnum.IDLE;
					break;
				}

				//Next player's turn
				if (playerIndex === currentPlayers.length - 1) {
					playerIndex = 0;
				} else {
					playerIndex++;
				}

				drawHangman(msg);
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
	msg.say(new MessageEmbed()
		.setColor(0x00AE86)
		.setTitle(`Hangman Will Start Soon! The category is: ${topic}`)
		.addFields(
			{
				name: "Join",
				value: `To join the game: Type ${config.prefix}hm join`
			},
			{
				name: "Players",
				value: `${currentPlayers.join(', ')}`
			},
			{
				name: "How To Play",
				value: `Guess letter(s), word(s), or number(s) by typing ${config.prefix}hm (guess)`
			},
			{
				name: "Start",
				value: `To start the game: Type ${config.prefix}hm start`
			},
			{
				name: "Quit",
				value: `To stop playing: Type ${config.prefix}hm GAME_STOP`
			}))
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
	msg.say(`Type ${config.prefix}hm (category) to play`);
	msg.say(new MessageEmbed()
		.setColor(0x00AE86)
		.setTitle("Categories")
		.setDescription(`${listCats}`))
}

//Draws the Hangman game
function drawHangman(msg) {

	//print whoever's turn if game hasnt ended
	if (badGuesses.length < 6 && displayedWord != actualWord) {
		msg.say(`It is your turn: ${currentPlayers[playerIndex]}`);
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

	drawing += `\nWord: ${displayedWord.toUpperCase().split('').join(' ')}\        ` +
		`\nIncorrect Guesses: ${badGuesses}` + ' \n';

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