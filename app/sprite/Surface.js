import { SpriteSheet } from './SpriteSheet';
import { Injectable  } from './Injectable';
import { Camera      } from './Camera';
import { Gl2d        } from './Gl2d';

export class Surface extends Injectable.inject({Gl2d, Camera, SpriteSheet})
{
	constructor(gl2d, map, xSize = 2, ySize = 2, xOffset = 0, yOffset = 0, layer = 0, tileWidth = 24, tileHeight = 32)
	{

		super();

		this.gl2d    = gl2d;
		this.x       = xOffset;
		this.y       = yOffset;
		this.layer   = layer;

		this.xSize   = xSize;
		this.ySize   = ySize;

		this.tileWidth  = tileWidth;
		this.tileHeight = tileHeight;

		this.width   = this.xSize * this.tileWidth;
		this.height  = this.ySize * this.tileHeight;

		this.map = map;

		this.texVertices = [];


		const gl         = this.gl2d.context;
		this.texture     = gl.createTexture();
		this.subTextures = {};

		this.loaded = false;

		this.generateTexture();

		this.tileChanges = [];
	}

	indexToLocal(i)
	{
		if(i > this.xSize * this.ySize)
		{
			return false;
		}

		const localX  = i % this.xSize;
		const localY  = Math.floor(i / this.xSize);

		return [localX, localY];
	}

	localToGlobal(localX, localY)
	{
		if(localX > this.xSize || localY > this.ySize)
		{
			return false;
		}

		const offsetX = Math.floor(this.x / this.tileWidth);
		const globalX = localX + offsetX;

		const offsetY = Math.floor(this.y / this.tileHeight);
		const globalY = localY + offsetY;

		return [globalX, globalY];
	}

	globalToLocal(globalX, globalY)
	{
		const offsetX = Math.floor(this.x / this.tileWidth);
		const localX = globalX - offsetX;

		const offsetY = Math.floor(this.y / this.tileHeight);
		const localY = globalY - offsetY;

		if(localX > this.xSize || localY > this.ySize)
		{
			return false;
		}

		return [localX, localY];
	}

	localToIndex(localX, localY)
	{
		if(localX > this.xSize || localY > this.ySize)
		{
			return false;
		}

		if(localX < 0 || localY < 0)
		{
			return false;
		}

		const index = localX + (localY * this.xSize);

		return index;
	}

	generateTile(i)
	{
		let vertices;

		const gl    = this.gl2d.context;
		const gl2d  = this.gl2d;

		const localX  = i % this.xSize;
		const offsetX = Math.floor(this.x / this.tileWidth);
		const globalX = localX + offsetX;

		const localY  = Math.floor(i / this.xSize);
		const offsetY = Math.floor(this.y / this.tileHeight);
		const globalY = localY + offsetY;

		let frames = this.map.getTile(globalX, globalY, this.layer);

		if(!frames)
		{
			return this.SpriteSheet.constructor.createCharacter(' ').then(
				(args)=>{
					this.subTextures[i] = args.texture;

					return args;
				}
			);
		}

		if(Array.isArray(frames))
		{
			let j = 0;
			this.subTextures[i] = [];

			return Promise.all(frames.map((frame)=>
				this.SpriteSheet.constructor.loadTexture(gl2d, frame).then(
					(args)=>{
						this.subTextures[i][j] = args.texture;
						j++;

						return args;
					}
				)
			));
		}
		else
		{
			return this.SpriteSheet.constructor.loadTexture(gl2d, frames).then(
				(args)=>{
					this.subTextures[i] = args.texture;

					return args;
				}
			);
		}
	}

	generateTexture()
	{
		const gl   = this.gl2d.context;
		const gl2d = this.gl2d;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		this.SpriteSheet.ready.then((sheet)=>{
			gl.bindTexture(gl.TEXTURE_2D, this.texture);

			const texturePromises = [];

			for(let i = 0; i < this.xSize*this.ySize; i++)
			{
				texturePromises.push(this.generateTile(i));
			}

			Promise.all(texturePromises).then(()=>{
				this.assemble();

				this.loaded = true;
			});
		});

		this.pane = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, this.pane);

		gl.texImage2D(
			gl.TEXTURE_2D
			, 0
			, gl.RGBA
			, this.width
			, this.height
			, 0
			, gl.RGBA
			, gl.UNSIGNED_BYTE
			, null
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		this.frameBuffer = gl.createFramebuffer();

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		const attachmentPoint = gl.COLOR_ATTACHMENT0;

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER
			, attachmentPoint
			, gl.TEXTURE_2D
			, this.pane
			, 0
		);
	}

	draw()
	{
		const gl = this.gl2d.context;

		gl.useProgram(this.gl2d.program);

		gl.bindTexture(gl.TEXTURE_2D, this.pane);

		this.setRectangle(
			this.x   - (this.Camera.x - (this.Camera.width  /2))
			, this.y - (this.Camera.y - (this.Camera.height /2))
			, this.width
			, this.height
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	assemble(index = false)
	{
		const gl = this.gl2d.context;

		gl.useProgram(this.gl2d.program);

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		gl.viewport(0, 0, this.width, this.height);

		gl.uniform4f(
			this.gl2d.colorLocation
			, 1
			, 0
			, 0
			, 1
		);

		gl.enableVertexAttribArray(this.gl2d.positionLocation);

		gl.uniform2f(
			this.gl2d.resolutionLocation
			, this.width
			, this.height
		);

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

		gl.vertexAttribPointer(
			this.gl2d.texCoordLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		for(let i in this.subTextures)
		{
			if(index !== false && i !== index)
			{
				continue;
			}

			if(index !== false)
			{
				console.log(i, index);
			}			
			
			this.renderTile(i);			
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	renderTile(i)
	{
		const gl = this.gl2d.context;

		if(!Array.isArray(this.subTextures[i]))
		{
			this.subTextures[i] = [this.subTextures[i]];
		}

		let local = this.indexToLocal(i);

		if(!local)
		{
			return;
		}

		let [xTile, yTile] = local;
		
		let x = xTile * this.tileWidth;
		let y = yTile * this.tileHeight;

		for(let j in this.subTextures[i])
		{
			gl.bindTexture(gl.TEXTURE_2D, this.subTextures[i][j]);
			gl.enableVertexAttribArray(this.gl2d.texCoordLocation);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);

			gl.vertexAttribPointer(
				this.gl2d.texCoordLocation
				, 2
				, gl.FLOAT
				, false
				, 0
				, 0
			);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.texCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				0.0,  0.0,
				1.0,  0.0,
				0.0,  1.0,
				0.0,  1.0,
				1.0,  0.0,
				1.0,  1.0,
			]), gl.STREAM_DRAW);

			this.setRectangle(
				x
				, y + this.tileHeight
				, this.tileWidth
				, - this.tileHeight
			);

			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}
	}

	setRectangle(x, y, width, height)
	{
		const gl = this.gl2d.context;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.positionBuffer);

		gl.vertexAttribPointer(
			this.gl2d.positionLocation
			, 2
			, gl.FLOAT
			, false
			, 0
			, 0
		);

		var x1 = x;
		var x2 = x + width;
		var y1 = y;
		var y2 = y + height;
		
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			x1, y2,
			x2, y2,
			x1, y1,
			x1, y1,
			x2, y2,
			x2, y1,
		]), gl.STATIC_DRAW);
	}
}
