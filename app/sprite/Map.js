import { SpriteSheet } from './SpriteSheet';
import { Injectable  } from './Injectable';

export class Map extends Injectable.inject({SpriteSheet})
{
	constructor()
	{
		super();

		this.tiles = {};
	}

	getTile(x, y, layer = 0)
	{
		if(this.tiles[`${x},${y}--${layer}`])
		{
			const tile = this.SpriteSheet.getFrame(this.tiles[`${x},${y}--${layer}`]);

			return [tile];
		}

		// return false;

		return [
			this.SpriteSheet.getFrame('pit.png')
		];

		return [
			this.SpriteSheet.getFrame('pit.png')
		];
	}

	setTile(x, y, image, layer = 0)
	{
		this.tiles[`${x},${y}--${layer}`] = image;

		return Promise.resolve();
	}

	export()
	{
		console.log(JSON.stringify(this.tiles));
	}

	import(input)
	{
		input = `{"-2,11":"lava_center_middle.png","-1,11":"lava_center_middle.png","0,11":"lava_center_middle.png"}`;

		this.tiles = JSON.parse(input);

		// console.log(JSON.parse(input));
	}
}


// {"-2,11":"lava_center_middle.png","-1,11":"lava_center_middle.png","0,11":"lava_center_middle.png"}