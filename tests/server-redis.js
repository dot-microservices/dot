#!/usr/bin/env node

'use strict';

const Redis = require('ioredis');
const Server = require('../src/server');

class TestService {
    static _name() {
        return 't';
    }

    static echo(request, reply) {
        reply(request);
    }
}

const server = new Server({
    discover: { key: 'test' },
    group: 'test',
    iface: 'wlp58s0',
    redis: new Redis(),
    secret: 'wrong value' // * discover.key overwrites secret which has an obvious "wrong value"
});
server.addService(TestService);
server.start();
