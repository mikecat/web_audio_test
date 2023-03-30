"use strict";

window.addEventListener("DOMContentLoaded", function() {
	const playButton = document.getElementById("play-button");
	const freqInput = document.getElementById("freq-input");
	const durationInput = document.getElementById("duration-input");
	const enqueueButton = document.getElementById("enqueue-button");

	let audioContext = null;
	let outputGenerator = null;

	playButton.addEventListener("click", async function() {
		if (audioContext === null) audioContext = new AudioContext();
		if (outputGenerator === null) {
			await audioContext.audioWorklet.addModule("output_generator.js");
			outputGenerator = new AudioWorkletNode(audioContext, "output-generator");
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
});
