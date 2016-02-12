'use strict';

const Mumble = require("mumble");
const config = require("./config");
const FS = require("fs");
const Winston = require("winston");
const Lame = require("lame");
const Samplerate = require("node-samplerate");
const Cite = require("./citations");

const mumbleOption = {};
const userEvents = {};

let connection;

let fromChannel, toChannel, queueChannel;
let ensureIsPlaying;
let playing = false;
let playbackFinishedIn;

const startMusic = () => {
	const stream = connection.inputStream();
	let soundTime = 0;
	const playingDone = () => {
		playing = false;
		for(const user of fromChannel.users) {
			if(user.session !== connection.user.session) {
				user.moveToChannel(toChannel);
			}
		}
		if(fromChannel.users.length) {
			play();
		}
	};
	const play = () => {
		for(const user of queueChannel.users) {
			user.moveToChannel(fromChannel);
		}
		playing = true;
		let fromRate;
		let toRate = 48000;
		FS.createReadStream(config.songFile)
			.pipe(new Lame.Decoder)
			.on("format", (fmt) => fromRate = fmt.sampleRate)
			.on("data", (chunk) => {
				stream.write(Samplerate.resample(chunk, fromRate, toRate, 1));
				soundTime += chunk.length / fromRate / 2;
			})
			.on("end", () => {
				setTimeout(() => playingDone(), soundTime * 1000);
				playbackFinishedIn = Date.now() + soundTime * 1000;
				soundTime = 0;
			});
	};
	play();
};

const setupEvents = () => {
	setInterval(() => {
		const time = playbackFinishedIn - Date.now();
		queueChannel.sendMessage("Nächstes mal in " + Math.round(time/1000) + " Sekunden.");
	}, 5000);
	setTimeout(() =>
		setInterval(() => {
			queueChannel.sendMessage(Cite[Math.floor(Math.random() * Cite.length)]);
		}, 100000),
	2500);
	connection.on("user-move", (user, from, to) => {
		if(to.id === queueChannel.id && !playing && user.session !== connection.user.session) {
			startMusic();
		}
	});
};

const startup = (conn) => {
	connection = conn;
	fromChannel = connection.channelByName(config.fromChannel);
	toChannel = connection.channelByName(config.toChannel);
	queueChannel = connection.channelByName(config.queueChannel);
	if(!fromChannel || !toChannel || !queueChannel) {
		connection.disconnect();
		Winston.error("Channel not found.");
	}
	fromChannel.join();
	setupEvents(connection);
	startMusic();
};

if(config.key && config.cert) {
	mumbleOption.key = FS.readFileSync(config.key);
	mumbleOption.cert = FS.readFileSync(config.cert);
}

Mumble.connect("mumble://" + config.url, mumbleOption, (err, connection) => {
	if(err) {
		throw err;
	}
	else {
		connection.on("error", (data) => Winston.error("An error with the mumble connection has occured:", data));
		connection.authenticate(config.name, config.password);
		connection.on("ready", () => startup(connection));
	}
});
