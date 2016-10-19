const path = require('path');
const { spawn } = require('child_process');

describe('Linter', function() {

	it('should not have any linter problems', function(done) {

		this.timeout(60000);

		let finished = false;

		function finish(error) {
			if (finished) return;
			finished = true;
			if (error && typeof error === 'number') {
				throw new Error(`Project contains linter errors (exit code ${error})`);
			} else if (error instanceof Error) {
				throw error;
			} else if (error) {
				throw new Error(`${error}`);
			}
			done();
		}

		const cwd = path.join(__dirname, '../..');
		let lintProc = spawn('node', [ path.join(cwd, 'node_modules/.bin/eslint'), '.' ], { cwd });

		lintProc.on('error', (error) => finish(error));

		lintProc.on('exit', (code, signal) => {
			if (code !== null) {
				finish(code || null);
			} else if (signal !== null) {
				finish(`Unexpected linter exit: ${signal}`);
			} else {
				finish('Unexpected linter exit');
			}
		});

	});

});
