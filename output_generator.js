"use strict";

class OutputGenerator extends AudioWorkletProcessor {
	constructor(...args) {
		super(...args);
		this.insnQueue = [];
		this.port.onmessage = (function(queue) {
			return function(e) {
				const d = e.data;
				queue.push({
					"mult": d.freq / sampleRate * Math.PI * 2,
					"durationFrame": d.duration / 1000 * sampleRate
				});
			};
		})(this.insnQueue);
		this.currentInsn = null;
		this.currentInsnStartFrame = null;
	}

	process(inputs, outputs, parameters) {
		if (this.currentInsn === null && this.insnQueue.length === 0) return true;
		const output = outputs[0][0]; // consider only first channel of first output
		for (let i = 0; i < output.length; i++) {
			const frame = currentFrame + i;
			if (this.currentInsn === null || frame - this.currentInsnStartFrame >= this.currentInsn.durationFrame) {
				if (this.insnQueue.length === 0) {
					this.currentInsn = null;
					break;
				}
				this.currentInsn = this.insnQueue.shift();
				this.currentInsnStartFrame = frame;
			}
			output[i] = Math.sin((frame - this.currentInsnStartFrame) * this.currentInsn.mult);
		}
		return true;
	}
}

registerProcessor("output-generator", OutputGenerator);
