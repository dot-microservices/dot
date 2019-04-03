#!/usr/bin/env node

'use strict';

const Client = require('../src/client');
const is = require('is_js');
const Redis = require('ioredis');
const test = require('tape').test;

const client = new Client({
    group: 'test',
    redis: new Redis(),
    secret: 'test',
    timeout: 4000
});

setTimeout(() => {
    test('Check basic socket communication', function (assert) {
        const payload = Math.random();
        client.send('t.echo', payload, response => {
            if (is.error(response)) assert.fail(response.message);
            else if (response === payload) assert.ok(response, `${response} received successfully!`);
            else assert.fail('invalid response');
            assert.end();
            process.exit(0);
        });
    });
}, 3000);
