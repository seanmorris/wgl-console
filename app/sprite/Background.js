import { Bindable } from 'curvature/base/Bindable';
import { Injectable } from './Injectable';

import { Gl2d } from './Gl2d';
import { Surface } from './Surface';
import { Camera } from './Camera';
import { SpriteSheet } from './SpriteSheet';

export class Background extends Injectable.inject({ Gl2d, Camera }) {
	constructor(gl2d, map, layer = 0, width = 24, height = 32) {
		super();

		Bindable.makeBindable(this);

		this.panes = [];
		this.panesXY = {};
		this.maxPanes = 9;

		this.surfaceX = 1;
		this.surfaceY = 1;

		this.spriteSheet = new SpriteSheet;

		this.tileWidth  = width;
		this.tileHeight = height;

		this.map = map;
		this.layer = layer;
	}

	updateTile(x, y)
	{
		return Promise.all(this.panes.map(pane => {

			const local = pane.globalToLocal(x,y);

			if(!local)
			{
				return false;
			}

			const index = pane.localToIndex(local[0], local[1]);

			if(index === false)
			{
				return false;
			}

			return pane.generateTile(index).then(t => pane.assemble());

		}).filter(x=>x));
	}

	renderPane(x, y, forceUpdate)
	{
		let pane;
		const gl2d = this.Gl2d;

		let paneX = x * (this.tileWidth * this.surfaceX);
		let paneY = y * (this.tileHeight * this.surfaceY);

		if(this.panesXY[paneX] && this.panesXY[paneX][paneY])
		{
			pane = this.panesXY[paneX][paneY];
		}
		else
		{
			pane = new Surface(
				gl2d
				, this.map
				, this.surfaceX
				, this.surfaceY
				, paneX
				, paneY
				, this.layer
				, this.tileWidth
				, this.tileHeight
			);

			if(!this.panesXY[paneX])
			{
				this.panesXY[paneX] = {};
			}

			if(!this.panesXY[paneX][paneY])
			{
				this.panesXY[paneX][paneY] = pane;
			}
		}

		this.panes.unshift(pane);

		if(this.panes.length > this.maxPanes)
		{
			this.panes.pop();
		}
	}

	draw()
	{
		const centerX = Math.floor(
			this.Camera.x / (this.surfaceX * this.tileWidth)
		);
		const centerY = Math.floor(
			this.Camera.y / (this.surfaceY * this.tileHeight)
		);

		// let range = [0,1];
		let range = [-1, 0, 1];
		// let range = [-2,-1,0,1,2];

		for (let x in range)
		{
			for (let y in range)
			{
				this.renderPane(centerX + range[x], centerY + range[y]);
			}
		}

		this.panes.map((p) => p.draw());
	}

	resize(x, y)
	{
		this.surfaceX = Math.ceil(x / this.tileWidth);
		this.surfaceY = Math.ceil(y / this.tileHeight);

		// this.panesXY[i][j].generateTexture();

		let firstX = false, firstY = false;

		for (let i in this.panesXY)
		{
			for (let j in this.panesXY[i])
			{
				delete this.panesXY[i][j];
				// this.panesXY[i][j].generateTexture();
			}
		}

		while (this.panes.length) {
			this.panes.pop();
		}
	}

	simulate()
	{}
}