import {describe, it, expect, beforeEach} from './test.helper';

import {match, sw} from '../src/index.js';

describe("the 'match' function", () => {
	
	it("can also be referred to as 'sw' for backwards compatibility", () => {
		
		expect(match).to.equal(sw);
		
	});
	
	let objectMap, objectFnMap, arrayMap, arrayFnMap;
	beforeEach(() => {
		objectMap = {
			      1: "one",
			      2: "two",
			     40: "forty",
			     50: "fifty",
			default: "default"
		};
		objectFnMap = {
			      1: () => "one",
			      2: () => "two",
			     40: () => "forty",
			     50: () => "fifty",
			default: () => "default"
		};
		arrayMap = [
			[[ 1],      "one"    ],
			[[ 2],      "two"    ],
			[[40],      "forty"  ],
			[[50, 100], "many"   ],
			['default', "default"]
		];
		arrayFnMap = [
			[[ 1],      () => "one"    ],
			[[ 2],      () => "two"    ],
			[[40],      () => "forty"  ],
			[[50, 100], () => "many"   ],
			['default', () => "default"]
		];
	});
	
	it("works when given an object map", async () => {
		
		expect(match(40)(objectMap)).to.equal("forty");
		
		expect(match('50')(objectMap)).to.equal("fifty");
		
	});
	
	it("works when given an object map with a default value", async () => {
		
		expect(match(42)(objectMap)).to.equal("default");
		
	});
	
	it("works when given an object map with functions", async () => {
		
		expect(match( 40 )(objectFnMap)).to.equal("forty");
		
		expect(match('50')(objectFnMap)).to.equal("fifty");
		
		expect(match( 40 , {autoInvoke: false})(objectFnMap)).to.be.a('function').that.equals(objectFnMap[ 40 ]);
		
		expect(match('50', {autoInvoke: false})(objectFnMap)).to.be.a('function').that.equals(objectFnMap['50']);
		
	});
	
	it("works when given an object map with a default value and functions", async () => {
		
		expect(match(42)(objectFnMap)).to.equal("default");
		
		expect(match(42, {autoInvoke: false})(objectFnMap)).to.be.a('function').that.equals(objectFnMap.default);
		
	});
	
	it("works when given an array map", async () => {
		
		expect(match( 40 )(...arrayMap)).to.equal("forty");
		
		expect(match('40')(...arrayMap)).not.to.equal("forty");
		
		expect(match( 50 )(...arrayMap)).to.equal("many");
		
		expect(match(100 )(...arrayMap)).to.equal("many");
		
	});
	
	it("works when given an array map with a default value", async () => {
		
		expect(match( 42 )(...arrayMap)).to.equal("default");
		
		expect(match('40')(...arrayMap)).to.equal("default");
		
	});
	
	it("works when given an array map with functions", async () => {

		expect(match(40)(...arrayFnMap)).to.equal("forty");

		expect(match(50)(...arrayFnMap)).to.equal("many");

		expect(match(40, {autoInvoke: false})(...arrayFnMap)).to.be.a('function');

		expect(match(50, {autoInvoke: false})(...arrayFnMap)).to.be.a('function');

	});

	it("works when given an array map with a default value and functions", async () => {

		expect(match(42)(...arrayFnMap)).to.equal("default");

		expect(match(42, {autoInvoke: false})(...arrayFnMap)).to.be.a('function');

	});
	
});

