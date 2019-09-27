#!/usr/bin/env node

'use strict';

const buildPath = require('path').join;
const Client = require('../src/client');
const { spawn } = require('child_process');

const client = new Client({ secret: 'test', group: 'test', timeout: 4000 });

const server = buildPath(__dirname, '/server.js');
const child = spawn(server);

test('Check basic socket communication', done => {
    setTimeout(() => {
        const payload = Math.random();
        client.send('t.echo', payload, r => {
            child.stdin.pause();
            child.kill();
            client.shutdown(() => client.disconnect());
            expect(r).toBe(payload);
            done();
        });
    }, 3000);
});
