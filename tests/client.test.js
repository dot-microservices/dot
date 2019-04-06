#!/usr/bin/env node

'use strict';

const buildPath = require('path').join;
const Client = require('../src/client');
const is = require('is_js');
const { spawn } = require('child_process');
const test = require('tape').test;

const client = new Client({ secret: 'test', group: 'test', timeout: 4000 });

const server = buildPath(__dirname, '/server.js');
const child = spawn(server);

setTimeout(() => {
    test('Check basic socket communication', function (assert) {
        const started = setTimeout(() => {
            assert.fail('service time out');
            child.stdin.pause();
            child.kill();
            client.shutdown(() => client.disconnect());
            assert.end();
        }, 5000);

        const payload = Math.random();
        client.send('t.echo', payload, response => {
            clearTimeout(started);
            if (is.error(response)) assert.fail(response.message);
            else if (response === payload) assert.ok(response, `${response} received successfully!`);
            else assert.fail('invalid response');
            client.shutdown(() => client.disconnect());
            assert.end();
        });
    });
}, 2000);