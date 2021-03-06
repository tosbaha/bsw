'use strict';

const {Producer} = require('../../index');
const {Consumer} = require('../../index');

const config = require('./config.json');
const replyHandler = require('./reply_handler');
const uuid = require('uuid/v4');

(async () => {
	const producer = new Producer({
		enable_logging: true,
		host: config.host,
		port: config.port,
		tube: config.tube
	});

	const replyTubeId = uuid();
	console.log(`Reply TubeID ${replyTubeId}`);

	const replyClient = new Consumer({
		enable_logging: true,
		host: config.host,
		port: config.port,
		tube: replyTubeId,
		reserve_timeout: 1,
		max_processing_jobs: 1,
		handler: replyHandler,
		final: async function (action, delay, result_or_error) {
			console.log(`[Reply Client] final() ==> action=${action}, delay=${delay}, result_or_error=${JSON.stringify(result_or_error)}`);
			replyClient.stop();
		}
	});

	// Error handling
	producer.on('error', e => {
		console.log('[Producer] error:', e);
	});

	// Stop event
	producer.on('close', () => {
		console.log('[Producer] connection closed!');
	});

	await producer.start();

	// we will start replyConsumer
	replyClient.on('error', e => {
		console.log('[Reply Client] error:', e);
	});

	// Stop event
	replyClient.on('close', () => {
		console.log('[Reply Client] connection closed!');
	});

	await replyClient.start();
	const randomNumber1 = Math.floor(Math.random() * 10 + 1);
	const randomNumber2 = Math.floor(Math.random() * 10 + 1);

	await producer.putJob({
		payload: JSON.stringify({
			randomNumber1: randomNumber1,
			randomNumber2: randomNumber2,
			replyTubeId: replyTubeId,
			result: 'success'
		}),
		priority: 0,
		delay: 0,
		ttr: 60
	});
	producer.stop();
})().catch(e => {
	console.log(e);
});
