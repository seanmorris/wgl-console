import { LineBuffer } from './LineBuffer';

const DONE = Symbol('done');

export class Shell
{
	constructor(logic)
	{
		this[DONE]  = false;
		this.error  = 0xFF;
		this.output = new LineBuffer();

		logic = logic(this.output);

		console.log(logic);

		this.logic  = new Promise(()=>logic);

		this.logic.then(result => {

			this.error = 0;

			console.log(result);

			return result;

		}).catch(error => {

			if(typeof error == 'number')
			{
				this.errorCode = error;
			}

			return false;

		}).finally(final => {

			this[DONE] = true;

			return final;

		});
	}

	then(method)
	{
		return this.logic.then(method);
	}

	catch(method)
	{
		return this.logic.catch(method);
	}

	finally(method)
	{
		return this.logic.finally(method);
	}

	done()
	{
		return this[DONE];
	}
}
