import { Bindable } from 'curvature/base/Bindable';

export class ViewBuffer
{
	constructor(terminal)
	{
		this.terminal = terminal;

		const bindable = Bindable.makeBindable(this);

		this.content = 'xoxe ';
		this.buffer = Bindable.makeBindable([]);

		this.bindTo('content', vv => {

			vv.split('').map((v,k,t,d) => {

				this.buffer[k] = v;

			});

			if(this.buffer.length == vv.length)
			{
				return;
			}

			this.buffer.splice(vv.length);
		});

		this.cursorX = terminal.cursorX;
		this.cursorY = terminal.cursorY;

		return bindable;
	}

	render()
	{
		const terminal = this.terminal;

		this.buffer.bindTo((v, k, t, d, p) => {

			k = parseInt(k);

			if(v === t[k])
			{
				return;
			}

			console.log(k,v);

			terminal.drawChar(v, this.cursorX + k, this.cursorY);
		});

		return terminal.newline();
	}
}
