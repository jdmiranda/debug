/**
 * Benchmark suite for debug package optimizations
 */

const debug = require('./src');
const assert = require('assert');

// Benchmark configuration
const ITERATIONS = 100000;
const WARMUP_ITERATIONS = 10000;

// Test data
const testNamespaces = [
	'app:server:request',
	'app:server:response',
	'app:database:query',
	'app:database:result',
	'app:cache:hit',
	'app:cache:miss',
	'test:*',
	'*:database:*'
];

const testFormats = [
	'Simple message',
	'Message with %s string',
	'Message with %d number',
	'Message with %j json',
	'Message with %O object',
	'Complex %s format with %d params and %j json'
];

/**
 * Run a benchmark
 */
function benchmark(name, fn, iterations = ITERATIONS) {
	// Warmup
	for (let i = 0; i < WARMUP_ITERATIONS; i++) {
		fn();
	}

	// Force garbage collection if available
	if (global.gc) {
		global.gc();
	}

	// Actual benchmark
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = process.hrtime.bigint();

	const duration = Number(end - start) / 1000000; // Convert to milliseconds
	const opsPerSec = (iterations / duration) * 1000;

	console.log(`${name}:`);
	console.log(`  Total: ${duration.toFixed(2)}ms`);
	console.log(`  Per operation: ${(duration / iterations * 1000).toFixed(3)}μs`);
	console.log(`  Ops/sec: ${opsPerSec.toFixed(0)}`);
	console.log();

	return {name, duration, opsPerSec};
}

/**
 * Benchmark suite
 */
function runBenchmarks() {
	console.log('='.repeat(60));
	console.log('Debug Package Performance Benchmarks');
	console.log('='.repeat(60));
	console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
	console.log(`Warmup: ${WARMUP_ITERATIONS.toLocaleString()}`);
	console.log();

	const results = [];

	// 1. Namespace creation benchmark
	console.log('1. Namespace Creation');
	console.log('-'.repeat(60));
	results.push(benchmark('Create debug instances', () => {
		for (const ns of testNamespaces) {
			debug(ns);
		}
	}));

	// 2. Color selection benchmark
	console.log('2. Color Selection (with caching)');
	console.log('-'.repeat(60));
	const colorDebug = debug('test:color:selection');
	results.push(benchmark('Select colors', () => {
		for (const ns of testNamespaces) {
			debug.selectColor(ns);
		}
	}));

	// 3. Namespace pattern matching benchmark
	console.log('3. Namespace Pattern Matching (with caching)');
	console.log('-'.repeat(60));
	debug.enable('app:*,test:*');
	results.push(benchmark('Match namespace patterns', () => {
		for (const ns of testNamespaces) {
			debug.enabled(ns);
		}
	}));

	// 4. Disabled logging benchmark (early exit)
	console.log('4. Disabled Logging (early exit optimization)');
	console.log('-'.repeat(60));
	debug.disable();
	const disabledLog = debug('disabled:namespace');
	disabledLog.log = () => {};
	results.push(benchmark('Call disabled logger', () => {
		disabledLog('This should not format', 'extra', 'params');
	}));

	// 5. Enabled logging with simple format
	console.log('5. Enabled Logging - Simple Format');
	console.log('-'.repeat(60));
	debug.enable('benchmark:*');
	const simpleLog = debug('benchmark:simple');
	simpleLog.log = () => {}; // Suppress output
	results.push(benchmark('Log simple messages', () => {
		simpleLog('Simple message');
	}));

	// 6. Enabled logging with format strings (cached)
	console.log('6. Enabled Logging - Format Strings (with caching)');
	console.log('-'.repeat(60));
	const formatLog = debug('benchmark:format');
	formatLog.log = () => {}; // Suppress output
	results.push(benchmark('Log with format strings', () => {
		formatLog('User %s logged in at %d', 'john', Date.now());
	}));

	// 7. Repeated format string benchmark (tests cache effectiveness)
	console.log('7. Repeated Format String (cache hit test)');
	console.log('-'.repeat(60));
	const repeatedLog = debug('benchmark:repeated');
	repeatedLog.log = () => {}; // Suppress output
	results.push(benchmark('Log same format repeatedly', () => {
		repeatedLog('Request %d from %s took %dms', 123, 'client', 45);
	}));

	// 8. Complex format benchmark
	console.log('8. Complex Format with Object');
	console.log('-'.repeat(60));
	const complexLog = debug('benchmark:complex');
	complexLog.log = () => {}; // Suppress output
	const testObj = {user: 'john', action: 'login', timestamp: Date.now()};
	results.push(benchmark('Log complex format', () => {
		complexLog('Event: %s with data %O', 'login', testObj);
	}));

	// 9. Namespace enable/disable benchmark
	console.log('9. Enable/Disable Namespaces');
	console.log('-'.repeat(60));
	results.push(benchmark('Toggle namespaces', () => {
		debug.enable('app:*,test:*,-test:exclude');
		debug.disable();
	}, ITERATIONS / 10)); // Fewer iterations for this test

	// 10. Mixed workload benchmark
	console.log('10. Mixed Workload');
	console.log('-'.repeat(60));
	debug.enable('mixed:*');
	const mixedLogs = [
		debug('mixed:one'),
		debug('mixed:two'),
		debug('mixed:three')
	];
	mixedLogs.forEach(log => {
		log.log = () => {};
	});
	let counter = 0;
	results.push(benchmark('Mixed logging operations', () => {
		const log = mixedLogs[counter % 3];
		const format = testFormats[counter % testFormats.length];
		log(format, 'param1', 123, {key: 'value'});
		counter++;
	}));

	// Summary
	console.log('='.repeat(60));
	console.log('Summary');
	console.log('='.repeat(60));
	console.log();
	results.forEach(result => {
		console.log(`${result.name}:`);
		console.log(`  ${result.opsPerSec.toFixed(0)} ops/sec`);
	});
	console.log();
	console.log('='.repeat(60));
	console.log('Benchmark Complete!');
	console.log('='.repeat(60));
}

// Run benchmarks
if (require.main === module) {
	console.log('Note: Run with --expose-gc for better memory management');
	console.log();
	runBenchmarks();
}

module.exports = {benchmark, runBenchmarks};
