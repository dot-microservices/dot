#!/usr/bin/env node

'use strict';

const Server = require('../src/server');

class TestService {
    static _name() {
        return 't';
    }

    static echo(request, reply) {
        reply(request);
    }
}

const server = new Server({ secret: 'wrong value', group: 'test', discover: { key: 'test' } });
// * discover.key overwrites secret which has an obvious "wrong value"
server.addService(TestService);
server.start();
