"use strict";

window.addEventListener("DOMContentLoaded", function() {
	const playButton = document.getElementById("play-button");
	const freqInput = document.getElementById("freq-input");
	const durationInput = document.getElementById("duration-input");
	const enqueueButton = document.getElementById("enqueue-button");

	const recButton = document.getElementById("rec-button");
	const amplitudeMeter = document.getElementById("amplitude-meter");
	const minArea = document.getElementById("min-area");
	const maxArea = document.getElementById("max-area");
	const avgArea = document.getElementById("avg-area");
	const freqArea = document.getElementById("freq-area");

	let audioContext = null;
	let outputGenerator = null;
	let sourceNode = null;
	let inputProcessor = null;

	playButton.addEventListener("click", async function() {
		if (audioContext === null) audioContext = new AudioContext();
		if (outputGenerator === null) {
			await audioContext.audioWorklet.addModule("output_generator.js");
			outputGenerator = new AudioWorkletNode(audioContext, "output-generator");
			outputGenerator.channelCountMode = "explicit";
			outputGenerator.channelCount = 1;
			outputGenerator.connect(audioContext.destination);
		}
		playButton.disabled = true;
		enqueueButton.disabled = false;
	});

	enqueueButton.addEventListener("click", function() {
		const freq = parseFloat(freqInput.value);
		const duration = parseFloat(durationInput.value);
		if (!isNaN(freq) && !isNaN(duration) && freq >= 0 && duration > 0) {
			outputGenerator.port.postMessage({
				"freq": freq,
				"duration": duration,
			});
		}
	});

	recButton.addEventListener("click", async function() {
		if (audioContext === null) audioContext = new AudioContext();
		if (sourceNode === null) {
			try {
				const source = await navigator.mediaDevices.getUserMedia({"audio": true});
				sourceNode = audioContext.createMediaStreamSource(source);
			} catch (error) {
				alert(error.name + ": " + error.message);
				return;
			}
		}
		if (inputProcessor === null) {
			await audioContext.audioWorklet.addModule("input_processor.js");
			inputProcessor = new AudioWorkletNode(audioContext, "input-processor");
			inputProcessor.channelCountMode = "explicit";
			inputProcessor.channelCount = 1;
			inputProcessor.port.onmessage = function(e) {
				const stat = e.data.stat, periods = e.data.periods;
				minArea.textContent = stat.min;
				maxArea.textContent = stat.max;
				avgArea.textContent = stat.avg;
				amplitudeMeter.value = Math.max(stat.max - stat.avg, stat.avg - stat.min);
				if (periods.length > 0) {
					let periodAvg = 0;
					for (let i = 0; i < periods.length; i++) periodAvg += periods[i];
					periodAvg /= periods.length;
					freqArea.textContent = 1 / periodAvg;
				}
			}
			sourceNode.connect(inputProcessor);
		}
		recButton.disabled = true;
	});
});
