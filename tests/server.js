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

const server = new Server({ secret: 'test', group: 'test' });
server.addService(TestService);
server.start();
