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
		this.framesFromUp = 0;
		this.isUp = true;
		this.upIntervals = [];
	}

	process(inputs, outputs, parameters) {
		const input = inputs[0][0]; // consider only first channel of first input
		// update data
		let ptr = this.logStartPos;
		for (let i = 0; i < input.length; i++) {
			this.logData[ptr] = input[i];
			ptr++;
			if(ptr >= this.logData.length) ptr = 0;
		}
		const newLogStartPos = ptr;
		ptr--;
		if (ptr < 0) ptr = this.logData.length - 1;
		// update blocks with updated data
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
		// update summary of all blocks
		const allData = {"max": this.logBlockData[0].max, "min": this.logBlockData[0].min, "avg": 0};
		for (let i = 0; i < this.logBlockData.length; i++) {
			if (allData.max < this.logBlockData[i].max) allData.max = this.logBlockData[i].max;
			if (allData.min > this.logBlockData[i].min) allData.min = this.logBlockData[i].min;
			allData.avg += this.logBlockData[i].avg;
		}
		allData.avg /= this.logBlockData.length;
		// check period
		const threshold = (allData.max - allData.min) * 0.05;
		for (let i = 0; i < input.length; i++) {
			if (this.isUp) {
				if (input[i] < allData.avg - threshold) this.isUp = false;
			} else {
				if (input[i] > allData.avg + threshold) {
					this.isUp = true;
					this.upIntervals.push(this.framesFromUp / sampleRate);
					this.framesFromUp = 0;
				}
			}
			this.framesFromUp++;
		}
		// periodically send data
		this.elapsedFrames += input.length;
		if (this.elapsedFrames >= this.logData.length) {
			this.elapsedFrames %= this.logData.length;
			this.port.postMessage({"stat": allData, "periods": this.upIntervals});
			this.upIntervals = [];
		}
	}
}

registerProcessor("input-processor", InputProcessor);
