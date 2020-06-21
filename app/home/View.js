import { Map         } from '../sprite/Map';
import { Sprite      } from '../sprite/Sprite';
import { SpriteSheet } from '../sprite/SpriteSheet';
import { SpriteBoard } from '../sprite/SpriteBoard';

import { Keyboard         } from 'curvature/input/Keyboard'
import { View as BaseView } from 'curvature/base/View';

// import { Shell } from '../console/Shell';
import { LineBuffer } from '../console/LineBuffer';

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

		this.cellSizeX = 8;
		this.cellSizeY = 11;

		this.scrollLock = false;

		this.style = '';
		this.color = 'white';
		this.bg    = 'black';
	}

	postRender()
	{
		const spriteBoard = this.spriteBoard = new SpriteBoard(
			this.tags.canvas.element
			, this.map
			, this.cellSizeX
			, this.cellSizeY
		);

		const vb  = new LineBuffer();
		const vb2 = new LineBuffer();
		const vb3 = new LineBuffer();
		
		this.inputBuffer = new LineBuffer();

		this.color = 'white';

		this.print(require('../static/declaration'))
			.then(() => this.color = 'white')
			.then(() => this.inputBuffer.render(this))
			.then(() => {

			this.cursor = new Sprite('_');

			this.color = 'white';

			this.cursor.x = this.cellSizeX * this.cursorX;
			this.cursor.y = this.cellSizeY * this.cursorY;

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
						const input = this.inputBuffer.content;

						return this.newline().then(()=>{

							const result = this.interpret(input);

							this.inputBuffer = new LineBuffer(this);

							if(typeof result === 'string' || !result)
							{
								const output = new LineBuffer(this);

								if(result === undefined)
								{
									output.content = `Command not found: "${input}"`;
								}
								else
								{
									output.content = result;
								}

								output.render(this);

								this.newline();
							}
							else if(Array.isArray(result))
							{
								result.map(b => {

									console.log(b);

									b.render(this);

									this.newline();

								})
							}
							else
							{
								result.render(this);

								return this.newline();
							}
						
						}).then(()=>{

							this.inputBuffer.render(this)

						});
					}

					if(k === 'Backspace')
					{
						this.inputBuffer.content = this.inputBuffer.content.substring(
							0, this.inputBuffer.content.length -1
						);

						this.receedCursor();
						
						bg.updateTile(pX, pY);

						this.cursor.x = this.cellSizeX * this.cursorX;
						this.cursor.y = this.cellSizeY * this.cursorY;

						if(!this.scrollLock)
						{
							this.zeroCamera();
						}

						return;
					}

					if(k.length !== 1)
					{
						return Promise.resolve();
					}

					this.inputBuffer.content += k;

					this.advanceCursor();

					const xOffset = (this.spriteBoard.Camera.width / 2) % 1;
					const yOffset = (this.spriteBoard.Camera.height / 2) % 1;

					this.cursor.x = this.cellSizeX * this.cursorX + xOffset;
					this.cursor.y = this.cellSizeY * this.cursorY + yOffset;

					if(!this.scrollLock)
					{
						this.zeroCamera();
					}
				}
			});
		} );

		let fThen      = 0;
		let fSamples   = [];
		let maxSamples = 5;

		this.updateFrame = false;

		const update = (now) =>{
			now = now / 1000;

			// this.keyboard.update();

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
		const zeroY = Math.floor(
			(document.body.clientHeight - (this.cellSizeY /2)) / 2
		);

		if(this.cursorY > this.lineHeight())
		{
			return this.scrollNewline();
		}
		
		this.spriteBoard.Camera.y = zeroY;
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

		if(char === "\u001b")
		{
			return Promise.resolve();
		}

		if(char === "\n")
		{
			return this.newline();
		}

		return this.map.SpriteSheet.createCharacter(

			char, this.cellSizeX, this.cellSizeY, this.color, this.bg, this.style

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
			char, this.cellSizeX, this.cellSizeY, this.color, this.bg, this.style
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
		if(!string)
		{
			return Promise.resolve().then(()=> this.resize());
		}

		const chars = string.split('');

		const spriteSheet = this.map.SpriteSheet;

		console.log(this.color, this.bg);

		const blitters = chars.map( char => spriteSheet.createCharacter(
			char, this.cellSizeX, this.cellSizeY, this.color, this.bg, this.style
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

	interpret(command)
	{
		const pallette = {

			clock: (timeout = 10, timeZone = 'America/New_York') => {

				const buff = new LineBuffer();

				const drop = this.onInterval(250, ()=> {
					buff.content = (new Date).toLocaleString('en-US', {
						timeZone
					});
				});

				if(timeout)
				{
					this.onTimeout(1000 * timeout, () => clearInterval(drop));
				}

				return buff;

			}

			, echo: (...args) => args.join(' ')


			, range: (start, end) => {

				start = parseInt(start);
				end   = parseInt(end);

				if(end <= start)
				{
					return;
				}

				const result = [];

				for(let i = start; i < end; i++)
				{
					result.push(i);
				}

				return result.join(', ');
			}

			, countdown: (top, interval) => {

				top = parseInt(top);

				if(top <= 0)
				{
					return;
				}

				const buff = new LineBuffer();

				const drop = this.onInterval(interval, () => {

					buff.content = top--;

					if(top <= 0)
					{
						buff.content = '0';

						clearInterval(drop);
					}

				});

				return buff;
			}

			, roll: (sides = 6, roll = 40) => {

				const maxInterval = 75;
				
				let interval = 15;

				const buff = new LineBuffer();
				const next = () => {

					const side = Math.floor(Math.random() * sides);

					if(roll > 0)
					{
						interval += interval * 0.05;

						if(maxInterval < interval)
						{
							interval = maxInterval;
						}

						buff.content = '\u001b[31m' + side;

						this.onTimeout(Math.random() * interval, next);
					}
					else
					{
						buff.content = '\u001b[34mX';
						buff.content = '\u001b[32m' + side;
					}

					roll--;
				};

				next();

				return buff;
			}

			, motd: () => {

				return require('../static/declaration');

			}

			, mx: (count, ...command) => {

				const buffers = [];

				for(let i = 0; i < count; i++)
				{
					buffers.push(
						this.interpret(command.join(' '))
					);
				}

				return buffers;
			}

		};

		const split   = command.split(/\s/);
		const program = split.shift();
		const args    = split.slice(0);
		const method  = pallette[ program ] || false;

		console.log(program, split);

		if(method)
		{
			return method(...args);
		}
	}
}