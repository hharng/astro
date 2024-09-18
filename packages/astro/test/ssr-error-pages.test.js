import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import * as cheerio from 'cheerio';
import testAdapter from './test-adapter.js';
import { loadFixture } from './test-utils.js';

describe('404 and 500 pages', () => {
	/** @type {import('./test-utils.js').Fixture} */
	let fixture;

	before(async () => {
		fixture = await loadFixture({
			root: './fixtures/ssr-error-pages/',
			output: 'server',
			adapter: testAdapter(),
			// test suite was authored when inlineStylesheets defaulted to never
			build: { inlineStylesheets: 'never' },
		});
	});

	describe('Development', () => {
		/** @type {import('./test-utils.js').DevServer} */
		let devServer;

		before(async () => {
			devServer = await fixture.startDevServer();
		});

		after(async () => {
			await devServer.stop();
		});

		it('Returns 404 when hitting an API route with the wrong method', async () => {
			let res = await fixture.fetch('/api/route', {
				method: 'PUT',
			});
			let html = await res.text();
			let $ = cheerio.load(html);
			assert.equal($('h1').text(), `Something went horribly wrong!`);
		});
	});

	describe('Production', () => {
		/** @type {import('./test-utils.js').App} */
		let app;

		before(async () => {
			await fixture.build({});
			app = await fixture.loadTestAdapterApp();
		});

		it('404 page returned when a route does not match', async () => {
			const request = new Request('http://example.com/some/fake/route');
			const response = await app.render(request);
			assert.equal(response.status, 404);
			const html = await response.text();
			const $ = cheerio.load(html);
			assert.equal($('h1').text(), 'Something went horribly wrong!');
		});

		it('404 page returned when a route does not match and passing routeData', async () => {
			const request = new Request('http://example.com/some/fake/route/');
			const routeData = app.match(request);
			const response = await app.render(request, { routeData });
			assert.equal(response.status, 404);
			const html = await response.text();
			const $ = cheerio.load(html);
			assert.equal($('h1').text(), 'Something went horribly wrong!');
		});

		it('404 page returned when a route does not match and imports are included', async () => {
			const request = new Request('http://example.com/blog/fake/route/');
			const routeData = app.match(request);
			const response = await app.render(request, { routeData });
			assert.equal(response.status, 404);
			const html = await response.text();
			const $ = cheerio.load(html);
			assert.equal($('head link').length, 1);
		});

		it('404 page returned when there is an 404 response returned from route', async () => {
			const request = new Request('http://example.com/causes-404/');
			const response = await app.render(request);
			assert.equal(response.status, 404);
			const html = await response.text();
			const $ = cheerio.load(html);
			assert.equal($('h1').text(), 'Something went horribly wrong!');
		});

		it('500 page returned when there is an error', async () => {
			const request = new Request('http://example.com/causes-error/');
			const response = await app.render(request);
			assert.equal(response.status, 500);
			const html = await response.text();
			const $ = cheerio.load(html);
			assert.equal($('h1').text(), 'This is an error page');
		});

		it('Returns 404 when hitting an API route with the wrong method', async () => {
			const request = new Request('http://example.com/api/route/', {
				method: 'PUT',
			});
			const response = await app.render(request);
			assert.equal(response.status, 404);
			const html = await response.text();
			const $ = cheerio.load(html);
			assert.equal($('h1').text(), `Something went horribly wrong!`);
		});
	});
});
