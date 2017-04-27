import {describe, it, expect, beforeEach} from './test.helper';

import ValueTracker, {event, property} from '../src/ValueTracker';

import {Observable} from "rxjs";

describe("ValueTracker class", () => {
	
	let Vector;
	let log;
	const record = (observable) => {
		expect(observable).to.be.an.instanceOf(Observable);
		observable.subscribe((v) => {
			log.push(v);
		});
	};
	
	beforeEach(() => {
		Vector = class Vector extends ValueTracker {
			
			constructor(x, y, z) {
				super();
				if (typeof x !== 'undefined') { this.x = x }
				if (typeof y !== 'undefined') { this.y = y }
				if (typeof z !== 'undefined') { this.z = z }
			}
			
			@property({ initial: 0, allowCacheInvalidation: true }) x;
			@property({ initial: 1                               }) y;
			@property({ initial: 2                               }) z;
			
		};
		log = [];
	});
	
	it("can build combinations with active and passive properties", () => {
		
		let obj = new Vector();
		
		record( obj.p(['x', 'y'], ['z'], (x, y, z) => [x, y, z]) );

		expect(log).to.eql([ [0, 1, 2] ]);
		
		obj.y = 5;
		
		expect(obj.y).to.equal(5);
		
		expect(log).to.eql([ [0, 1, 2] ,
		                     [0, 5, 2] ]);
		
		obj.z = 9;
		
		expect(log).to.eql([ [0, 1, 2] ,
		                     [0, 5, 2] ]);
		
		obj.y = 7;
		
		expect(log).to.eql([ [0, 1, 2] ,
		                     [0, 5, 2] ,
		                     [0, 7, 9] ]);
		
	});
	
	it("can build dynamically linked event chains", async () => {
		
		class Passenger extends ValueTracker {
			@property({}) carriage;
		}
		
		let carriage1 = new Vector();
		let carriage2 = new Vector();
		let passenger = new Passenger();
		
		record( passenger.p('carriage.x') );
		
		expect(log).to.eql([]);
		
		passenger.carriage = carriage1;
		
		expect(log).to.eql([ 0 ]);
		
		carriage1.x = 22;
		
		expect(log).to.eql([ 0, 22 ]);
		
		passenger.carriage = carriage2;
		
		carriage2.x = 42;
		
		expect(log).to.eql([ 0, 22, 0, 42 ]);
		
		carriage1.x = 999;
		 
		expect(log).to.eql([ 0, 22, 0, 42 ]);
		
		passenger.carriage = carriage1;
		
		expect(log).to.eql([ 0, 22, 0, 42, 999 ]);
		
		passenger.carriage = null;
		
		expect(log).to.eql([ 0, 22, 0, 42, 999 ]);
		
		passenger.carriage = carriage1;
		
		expect(log).to.eql([ 0, 22, 0, 42, 999, 999 ]);
		
	});
	
	it("can build loosely linked event chains", async () => {

		class Passenger extends ValueTracker {
			@property({}) carriage;
		}

		let carriage1 = new Vector();
		let carriage2 = new Vector();
		let passenger = new Passenger();

		record( passenger.p('carriage?.x') );

		expect(log).to.eql([ null ]);

		passenger.carriage = carriage1;

		expect(log).to.eql([ null, 0 ]);

		carriage1.x = 22;

		expect(log).to.eql([ null, 0, 22 ]);

		passenger.carriage = carriage2;

		carriage2.x = 42;

		expect(log).to.eql([ null, 0, 22, 0, 42 ]);

		carriage1.x = 999;

		expect(log).to.eql([ null, 0, 22, 0, 42 ]);

		passenger.carriage = carriage1;

		expect(log).to.eql([ null, 0, 22, 0, 42, 999 ]);

		passenger.carriage = null;

		expect(log).to.eql([ null, 0, 22, 0, 42, 999, null ]);

		passenger.carriage = carriage1;

		expect(log).to.eql([ null, 0, 22, 0, 42, 999, null, 999 ]);

	});
	
	it("can invalidate a property's cache to re-emit the same value again", () => {
		
		let obj = new Vector();
		
		record( obj.p('x') );

		expect(log).to.eql([0]);
		
		obj.p('x').next(1);
		
		expect(log).to.eql([0, 1]);
		
		obj.p('x').next(1);
		
		expect(log).to.eql([0, 1]);
		
		obj.p('x').invalidateCache();
		
		obj.p('x').next(1);
		
		expect(log).to.eql([0, 1, 1]);
		
		obj.p('x').next(1);
		
		expect(log).to.eql([0, 1, 1]);
		
	});
	
	it("can define a property derived entirely from a source stream", () => {
		
		let obj = new Vector(0, 0, 0);
		
		obj.newProperty('length', {
			source: [['x', 'y', 'z'], (x, y, z) => Math.sqrt(x*x + y*y + z*z)]
		});
		
		record( obj.p('length') );

		expect(log).to.eql([0]);
		
		obj.p('x').next(3*3);
		
		expect(log).to.eql([0, 3*3]);
		
		obj.p('y').next(3*4);
		
		expect(log).to.eql([0, 3*3, 3*5]);
		
		obj.p('z').next(4*5);
		
		expect(log).to.eql([0, 3*3, 3*5, 5*5]);
		
	});
	
	it("can build dynamically linked event chains with an event (not a property) at the end", () => {
		
		class Person extends ValueTracker {
			@property() phone;
		}
		
		class Phone extends ValueTracker {
			@event() ringEvent;
		}
		
		let phone1 = new Phone;
		let phone2 = new Phone;
		let person = new Person;
		
		record( person.e('phone.ring') );
		
		expect(log).to.eql([]);
		
		person.phone = phone1;
		
		expect(log).to.eql([]);
		
		phone1.e('ring').next(22);
		
		expect(log).to.eql([ 22 ]);
		
		person.phone = phone2;
		
		phone2.e('ring').next(42);
		
		expect(log).to.eql([ 22, 42 ]);
		
		phone1.e('ring').next(999);
		 
		expect(log).to.eql([ 22, 42 ]);
		
		person.phone = phone1;
		
		expect(log).to.eql([ 22, 42 ]);
		
		person.phone = null;
		
		expect(log).to.eql([ 22, 42 ]);
		
		person.phone = phone1;
		
		expect(log).to.eql([ 22, 42 ]);
		
	});
	
	
});

