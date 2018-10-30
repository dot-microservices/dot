#!/usr/bin/env node

'use strict';

const Server = require('../src/server');

class TestService {
    static echo(request, reply) {
        reply(request);
    }
}

const server = new Server({ secret: 'test', group: 'test' });
server.addService(TestService);
server.start();
