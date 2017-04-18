import {describe, it, expect, beforeEach} from './test.helper';

// import {ValueTracker, property, babelHelpers, filter, global, humanMsg} from '../src/index.js';
import * as exports from '../src/index.js';

describe("package entry-point", () => {
	
	it("properly exports utilities from all categories", async () => {
		
		expect(exports).to.have.property('ValueTracker');
		expect(exports).to.have.property('property');
		expect(exports).to.have.property('babelHelpers');
		expect(exports).to.have.property('global');
		expect(exports).to.have.property('humanMsg');
		
	});
	
});

