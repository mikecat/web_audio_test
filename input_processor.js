"use strict";

class InputProcessor extends AudioWorkletProcessor {
	constructor(...args) {
		super(...args);
		const processTime = 0.1; // [s]
		const logSizeRaw = sampleRate * processTime;
		const logBlockSize = Math.round(Math.sqrt(logSizeRaw));
		const logSize = logBlockSize * logBlockSize;
		this.logData = new Array(logSize);
		this.logBlockData = new Array(logBlockSize);
		for (let i = 0; i < this.logData.length; i++) {
			this.logData[i] = 0;
		}
		for (let i = 0; i < this.logBlockData.length; i++) {
			this.logBlockData[i] = {
				"max": 0,
				"min": 0,
				"avg": 0,
			};
		}
		this.logStartPos = 0;
		this.elapsedFrames = 0;
	}

	process(inputs, outputs, parameters) {
		const input = inputs[0][0]; // consider only first channel of first input
		let ptr = this.logStartPos;
		for (let i = 0; i < input.length; i++) {
			this.logData[ptr] = input[i];
			ptr++;
			if(ptr >= this.logData.length) ptr = 0;
		}
		const newLogStartPos = ptr;
		ptr--;
		if (ptr < 0) ptr = this.logData.length - 1;
		const startBlock = Math.floor(this.logStartPos / this.logBlockData.length);
		const endBlock = Math.floor(ptr / this.logBlockData.length);
		this.logStartPos = newLogStartPos;
		for (let i = startBlock; ; ) {
			const offset = this.logBlockData.length * i;
			const firstValue = this.logData[offset];
			const newData = {"max": firstValue, "min": firstValue, "avg": 0};
			for (let j = 0; j < this.logBlockData.length; j++) {
				const data = this.logData[offset + j];
				if (newData.max < data) newData.max = data;
				if (newData.min > data) newData.min = data;
				newData.avg += data;
			}
			newData.avg /= this.logBlockData.length;
			this.logBlockData[i] = newData;
			if (i == endBlock) break;
			i++;
			if (i >= this.logBlockData.length) i = 0;
		}
		this.elapsedFrames += input.length;
		if (this.elapsedFrames >= this.logData.length) {
			this.elapsedFrames %= this.logData.length;
			const resultData = {"max": this.logBlockData[0].max, "min": this.logBlockData[0].min, "avg": 0};
			for (let i = 0; i < this.logBlockData.length; i++) {
				if (resultData.max < this.logBlockData[i].max) resultData.max = this.logBlockData[i].max;
				if (resultData.min > this.logBlockData[i].min) resultData.min = this.logBlockData[i].min;
				resultData.avg += this.logBlockData[i].avg;
			}
			resultData.avg /= this.logBlockData.length;
			this.port.postMessage(resultData);
		}
	}
}

registerProcessor("input-processor", InputProcessor);
