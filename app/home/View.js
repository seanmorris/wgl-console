import { Map         } from '../sprite/Map';
import { Sprite      } from '../sprite/Sprite';
import { SpriteSheet } from '../sprite/SpriteSheet';
import { SpriteBoard } from '../sprite/SpriteBoard';

import { Keyboard         } from 'curvature/input/Keyboard'
import { View as BaseView } from 'curvature/base/View';

import { ViewBuffer } from '../ViewBuffer';

export class View extends BaseView
{
	constructor(args)
	{
		super(args);

		this.routes      = {};
		this.template    = require('./view.tmp');
		this.map         = new Map;
		this.keyboard    = new Keyboard;

		this.cursorX = 0;
		this.cursorY = 0;

		this.cellSizeX = 14;
		this.cellSizeY = 21;

		this.scrollLock = false;

		this.color = 'white';
	}

	postRender()
	{
		const spriteBoard = this.spriteBoard = new SpriteBoard(
			this.tags.canvas.element
			, this.map
			, this.cellSizeX
			, this.cellSizeY
		);

		const vb = new ViewBuffer(this);

		vb.content = 'something';

		this.onInterval(1000, () => {

			vb.content = (new Date).toString();

		});

		this.color = 'lightgreen';

		vb.render().then(() => this.print(
			`Two roads diverged in a yellow wood...`
		)).then(() => {

			this.cursor = new Sprite('X');

			this.cursor.x = this.cellSizeX * this.cursorX;
			this.cursor.y = this.cellSizeY * this.cursorY;

			this.color = 'white';

			spriteBoard.sprites.add(this.cursor);

			this.keyboard.keys.bindTo((v,k,t,d)=>{

				if(v == -1 || v > 30)
				{
					switch(k)
					{
						case 'Alt':
							this.color = this.color === 'white'
								? 'red'
								: 'white';
							break;

						case 'ScrollLock':
							this.scrollLock = !this.scrollLock;
							break;

						case 'ArrowUp':
							if(this.scrollLock)
							{
								this.spriteBoard.Camera.y -= this.cellSizeY;
							}
							break;

						case 'ArrowDown':
							if(this.scrollLock)
							{
								this.spriteBoard.Camera.y += this.cellSizeY;
							}
							break;

						case 'ArrowLeft':
							if(this.scrollLock)
							{
								this.spriteBoard.Camera.x -= this.cellSizeX;
							}
							break;

						case 'ArrowRight':
							if(this.scrollLock)
							{
								this.spriteBoard.Camera.x += this.cellSizeX;
							}
							break;

					}

					const bg = this.spriteBoard.background;
					const pX = this.cursorX;
					const pY = this.cursorY;

					if(k === 'Enter')
					{
						return this.newline().then(()=>{
							bg.updateTile(pX, pY);
							bg.updateTile(0, this.cursorY);
						});

						return;
					}

					if(k === 'Backspace')
					{
						this.drawChar(' ').then(() => {
							this.receedCursor();
							
							bg.updateTile(pX, pY);

							this.cursor.x = this.cellSizeX * this.cursorX;
							this.cursor.y = this.cellSizeY * this.cursorY;
						});

						return;
					}

					if(k.length !== 1)
					{
						return;
					}

					this.printChar(k).then(()=>{

						const halfCell = this.cellSizeY / 2;
						
						this.cursor.x = this.cellSizeX * this.cursorX;
						this.cursor.y = this.cellSizeY * this.cursorY;
					});
				}
			});
		} );

		let fThen      = 0;
		let fSamples   = [];
		let maxSamples = 5;

		this.updateFrame = false;

		const update = (now) =>{
			now = now / 1000;

			this.keyboard.update();

			const delta = now - fThen;

			if(delta < 1/(this.args.frameLock+(10 * (this.args.frameLock/60))))
			{
				this.updateFrame = requestAnimationFrame(update);
				return;
			}

			fThen = now;

			if(this.args.frameLock == 0)
			{
				this.updateFrame = requestAnimationFrame(update);
				fSamples = [0];
				return;
			}


			this.spriteBoard.draw();

			this.updateFrame = requestAnimationFrame(update);

			fSamples.push(this.args._fps);

			while(fSamples.length > maxSamples)
			{
				fSamples.shift();
			}

			this.args._fps = (1 / delta);

			this.args.camX = this.spriteBoard.Camera.x;
			this.args.camY = this.spriteBoard.Camera.y;
		};

		this.resize();

		this.zeroCamera();

		update();

		this.willResize = false;

		this.width  = document.body.clientWidth;
		this.height = document.body.clientHeight

		window.addEventListener('resize', () => {

			this.width  = document.body.clientWidth;
			this.height = document.body.clientHeight

			this.resize();

			cancelAnimationFrame(this.updateFrame);

			this.updateFrame = requestAnimationFrame(update);
		});
	}

	resize(x, y)
	{
		this.args.width  = this.tags.canvas.element.width  = x || this.width;
		this.args.height = this.tags.canvas.element.height = y || this.height;

		this.args.rwidth  = Math.floor(
			(x || this.width)  / this.spriteBoard.zoomLevel
		);

		this.args.rheight = Math.floor(
			(y || this.height) / this.spriteBoard.zoomLevel
		);

		this.zeroCameraX();

		if(this.resizeFrame)
		{
			cancelAnimationFrame(this.resizeFrame);
			this.resizeFrame = false;
		}

		this.resizeFrame = requestAnimationFrame(()=>this.spriteBoard.resize());

		return Promise.resolve();
	}

	zeroCameraX()
	{
		this.spriteBoard.Camera.x = Math.floor(
			(document.body.clientWidth  - (this.cellSizeY /2)) / 2
		);
	}

	zeroCameraY()
	{
		this.spriteBoard.Camera.y = Math.floor(
			(document.body.clientHeight - (this.cellSizeY /2)) / 2
		);
	}

	zeroCamera()
	{
		this.zeroCameraX();
		this.zeroCameraY();
	}

	lineWidth()
	{
		return Math.floor(
			(document.body.clientWidth  - (this.cellSizeX *2)) / this.cellSizeX
		);
	}

	lineHeight()
	{
		return Math.floor(
			(document.body.clientHeight - (this.cellSizeY /2)) / this.cellSizeY
		) - 1;
	}

	advanceCursor()
	{
		this.cursorX++;

		if(this.cursorX > this.lineWidth())
		{
			this.cursorX = 0;
			this.cursorY++;
		}

		this.scrollNewline();
	}

	newline()
	{
		return new Promise((accept) => {

			this.cursorX = 0;
			this.cursorY++;
			
			this.scrollNewline();

			return accept();

		}).then(() => {

			if(this.cursor)
			{
				this.cursor.x = 0;
				this.cursor.y = this.cellSizeY * this.cursorY;
			}
		});
	}

	scrollNewline()
	{
		if(this.scrollLock)
		{
			return;
		}

		const lineHeight = this.lineHeight();

		const halfCell = this.cellSizeY / 2;

		const centerY = Math.floor((document.body.clientHeight - halfCell) / 2);

		if(this.cursorY >= lineHeight)
		{
			this.spriteBoard.Camera.y = centerY + (this.cursorY - lineHeight) * this.cellSizeY;
		}
	}

	receedCursor()
	{
		this.cursorX--;

		if(this.cursorX < 0)
		{
			this.cursorX = this.lineWidth();
			this.cursorY--;
		}
	}

	drawChar(char, x, y)
	{
		const bg = this.spriteBoard.background;

		x = x === undefined ? this.cursorX : x;
		y = y === undefined ? this.cursorY : y;


		return this.map.SpriteSheet.createCharacter(

			char, this.cellSizeX, this.cellSizeY, this.color

		).then(key => {
		
			this.map.setTile(x, y, key)
		
		}).then(() => {
		
			bg.updateTile(x, y)

		});

	}

	printChar(char)
	{
		const bg = this.spriteBoard.background;

		if(char === "\n")
		{
			return this.newline();
			return;
		}

		return this.map.SpriteSheet.createCharacter(
			char, this.cellSizeX, this.cellSizeY, this.color
		).then(
			(key) => {

				return this.map.setTile(this.cursorX, this.cursorY, key);

			}).then(() => {

				bg.updateTile(this.cursorX, this.cursorY);

			}).then(() => {

				return this.advanceCursor();
			}
		);
	}

	print(string)
	{
		const chars = string.split('');

		const spriteSheet = this.map.SpriteSheet;

		const blitters = chars.map( char => spriteSheet.createCharacter(
			char, this.cellSizeX, this.cellSizeY
		));
		
		const printer = (chars) => {
			
			const char = chars.shift();

			return this.printChar(char).then(()=>{
				if(chars.length)
				{
					return printer(chars);
				}
				else
				{
					return Promise.resolve();
				}
			});
		};

		return Promise.all(blitters).then(
			(blitted)=>printer(chars))
			.then(()=>this.newline())
			.then(()=>this.resize());
	}

	scroll(event)
	{
		if(event.deltaY > 0)
		{
			this.spriteBoard.Camera.y += this.cellSizeY;
		}
		else if(event.deltaY < 0)
		{
			this.spriteBoard.Camera.y -= this.cellSizeY;
		}
	}
}