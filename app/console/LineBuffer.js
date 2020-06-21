import { Bindable } from 'curvature/base/Bindable';

export class LineBuffer
{
	constructor()
	{
		const bindable = Bindable.makeBindable(this);

		this.content  = '';
		this.buffer   = Bindable.makeBindable([]);
		this.rendered = false;

		return bindable;
	}

	render(terminal)
	{
		if(this.rendered)
		{
			return Promise.resolve();
		}

		this.rendered = true;

		const cursorX  = terminal.cursorX;
		const cursorY  = terminal.cursorY;
		
		this.buffer.bindTo((v, k, t, d, p) => {

			k = parseInt(k);

			if(d)
			{
				terminal.drawChar(' ', cursorX + k, cursorY);
				return;
			}


			if(v === t[k])
			{
				return;
			}

			terminal.drawChar(v, cursorX + k, cursorY);
		});
		
		const originalFg = terminal.color;
		const originalBg = terminal.bg;
		
		const originalStyle = terminal.style;

		this.bindTo('content', vv => {

			const chars = this.colorText(vv);

			chars.map((v,k,t,d) => {


				for(const index in chars)
				{
					const char = chars[index];

					if(k < index)
					{
						break;
					}

					terminal.color = char.fg;
					terminal.bg    = char.bg;
					terminal.style = char.style;
				}

				this.buffer[k] = v.char;

				terminal.color = originalFg;
				terminal.bg    = originalBg;
				terminal.style = originalStyle;
			});

			const bufferLength = this.buffer.length;

			for(let i = bufferLength; i >= chars.length; i--)
			{
				delete this.buffer[i];
			}
		});
	}

	colorText(line)
	{
		const chars  = String(line).split('');
		const output = [];

		let fg = 'white';//this.terminal.color;
		let bg = 'black';//this.terminal.bg;

		let style = '';//this.terminal.style;

		const originalFg = fg;
		const originalBg = bg;
		
		const originalStyle = style;

		for(let index = 0; index < chars.length; index++)
		{
			const char = chars[index];

			if(char == "\u001b")
			{
				let input = '';

				index++;

				if(chars[index] !== '[')
				{
					continue;
				}

				while(chars[index] !== 'm' && index < chars.length)
				{
					index++;

					switch(chars[index])
					{
						case 'm':
							break;

						default:
							input += chars[index];
					}					
				}

				const colors = input.split(';');
				
				fg = originalFg;
				bg = originalBg;

				style = originalStyle;

				for(let index in colors)
				{
					index = parseInt(index);

					const color = colors[index];

					let x;

					if(color == 0)
					{
						fg = originalFg;
						bg = originalBg;

						style = originalStyle;
					}

					if(color == 38)
					{
						if(colors[index + 1] == 2)
						{	
							const parts = colors.splice(index + 2, 3).map(c => 
								parseInt(c).toString(16).padStart(2, 0)
							);

							fg = '#' + parts.join('');
						}

						continue;
					}
					else if(x = this.mapFgColor(color))
					{
						fg = x;
						continue;
					}

					if(color == 48)
					{
						if(colors[index + 1] == 2)
						{
							const parts = colors.splice(index + 2, 3).map(c => 
								parseInt(c).toString(16).padStart(2, 0)
							);

							bg = '#' + parts.join('');							
						}


						continue;
					}
					else if(x = this.mapBgColor(color))
					{
						bg = x;
						continue;
					}

					if(x = this.mapStyle(color))
					{
						style += ' ' + x;
						continue;
					}
				}

				continue;
			}

			output.push({char, fg, bg, style});
		}

		return output;
	}

	mapFgColor(color)
	{
		const fg = {
			30:   'Black'
			, 31: 'Red'
			, 32: 'Green'
			, 33: 'Yellow'
			, 34: 'Blue'
			, 35: 'Magenta'
			, 36: 'Cyan'
			, 37: 'White'
		};

		if(color in fg)
		{
			return fg[color];
		}

		return false;
	}

	mapBgColor(color)
	{
		const bg = {
			40: 'Black'
			, 41: 'Red'
			, 42: 'Green'
			, 43: 'Yellow'
			, 44: 'Blue'
			, 45: 'Magenta'
			, 46: 'Cyan'
			, 47: 'White'
		};

		if(color in bg)
		{
			return bg[color];
		}

		return false;
	}

	mapStyle(style)
	{
		const styles = {
			1: 'bold'
			, 3: 'italic'
			// , 4: 'underline'
			// , 7: 'reversed'
		};

		if(style in styles)
		{
			return styles[style];
		}

		return false;
	}
}
