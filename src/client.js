'use strict';

const axon = require('axon');
const is = require('is_js');

const Base = require('./base');

/**
 * @class Client
 * @extends {Base}
 */
class Client extends Base {
    /**
     *Creates an instance of Client.
     * @param {Object} [options={}]
     * @memberof Client
     */
    constructor(options={}) {
        super(options);

        this._flag = { f: false };
        this._messages = [];
        this._sockets = {};
        this.advertise({ client: true }, this._serviceFound.bind(this), this._serviceLost.bind(this));
    }

    /**
     * @description Fires up when a new service found
     * @param {Object} ad details about service
     * @access private
     * @memberof Client
     */
    _serviceFound(ad) {
        if (!ad.hasOwnProperty('advertisement') || is.not.object(ad.advertisement)) return;
        else if (is.not.number(ad.advertisement.port)) return;
        else if (is.not.string(ad.address) || is.not.ip(ad.address)) return;
        else if (is.not.array(ad.advertisement.services) || is.empty(ad.advertisement.services)) return;

        if (is.string(this.options.group) && is.not.empty(this.options.group))
            if (this.options.group !== ad.advertisement.group) {
                this._dequeue();
                return;
            }

        this.success(ad);
        const socket = axon.socket('req');
        socket.connect(ad.advertisement.port, ad.address);

        for (let service of ad.advertisement.services) {
            if (!this._sockets.hasOwnProperty(service)) this._sockets[service] = {};
            if (!this._sockets[service].hasOwnProperty(ad.id))
                this._sockets[service][ad.id] = socket;
        }
        this._dequeue();
    }

    /**
     * @description Fires up when an existing service gone
     * @param {Object} ad details about service
     * @access private
     * @memberof Client
     */
    _serviceLost(ad) {
        if (!ad.hasOwnProperty('advertisement') || is.not.object(ad.advertisement)) return;
        else if (is.not.number(ad.advertisement.port)) return;
        else if (is.not.array(ad.advertisement.services) || is.empty(ad.advertisement.services)) return;

        this.warning(ad);
        for (let service of ad.advertisement.services) {
            if (this._sockets.hasOwnProperty(service))
                if (this._sockets[service].hasOwnProperty(ad.id)) {
                    try {
                        this._sockets[service][ad.id].close();
                    } catch(e) {
                        this.fail(e.toString());
                    }
                    delete this._sockets[service][ad.id];
                }
        }
    }

    /**
     * @description Finds a valid socket for service
     * @param {String} service
     * @returns socket
     * @access private
     * @memberof Client
     */
    _getSocket(service) {
        if (!this._sockets.hasOwnProperty(service)) return null;

        const sockets = Object.keys(this._sockets[service]);
        if (!sockets.length) return null;

        return this._sockets[service][sockets[Math.floor(Math.random() * sockets.length)]];
    }

    /**
     * @description Puts messages into queue
     * @param {Array} request example: [path, payload, callback]
     * @throws Error
     * @access private
     * @memberof Client
     */
    _enqueue(request) {
        if (is.not.array(request) || request.length < 4)
            throw new Error('request must be an array with at least 3 items: path, payload, timeout, callback');
        else if (is.not.function(request[3]))
            throw new Error('callback (3nd item) must be a function');

        if (is.not.number(request[2]) || request[2] <= 0) request[2] = Date.now();
        this._messages.push(request);
    }

    /**
     * @description Consumes pending messages in the queue
     * @access private
     * @memberof Client
     */
    _dequeue() {
        if (!this._messages.length) return this._flag.f = false;
        else if (this._flag.f) return;

        this._flag.f = true;
        const message = this._messages.shift();
        const delay = this.options.delay;
        if (is.number(delay) && delay > 0)
            if (Date.now() - message[2] < delay)
                process.nextTick(() => this.send(message[0], message[1], message[2], message[3]));
            else message[3](new Error('SERVICE_TIMEOUT'));

        setTimeout(() => {
            this._flag.f = false;
            this._dequeue();
        }, 20);
    }

    /**
     * @description Sends a request
     * @param {String} path service call
     * @param {Any} payload data
     * @param {Number} [timestamp]
     * @param {Function} cb callback
     * @memberof Client
     */
    send(path, payload, timestamp, cb) {
        if (is.not.string(path) || is.empty(path)) return cb(new Error('INVALID_PATH'));

        if (is.function(timestamp)) {
            cb = timestamp;
            timestamp = 0;
        }

        const delimiter = this.options.delimiter;
        const delay = this.options.delay;
        const timeout = this.options.timeout, useTimeout = is.number(timeout) && timeout > 0;
        const service = path.split(is.string(delimiter) && is.not.empty(delimiter) ? delimiter : '.');
        if (service.length < 2) return cb(new Error('MISSING_METHOD'));
        else if (!service[1].trim().length || service[1].charAt(0) === '_')
            return cb(new Error('INVALID_METHOD'));

        const socket = this._getSocket(service[0]);
        if (socket) {
            let t_o = null;
            try {
                if (useTimeout)
                    t_o = setTimeout(() => {
                        t_o = null;
                        cb(new Error('REQUEST_TIMEOUT'));
                    }, timeout);
                socket.send(path, payload, response => {
                    if (!useTimeout || t_o) {
                        if (t_o) clearTimeout(t_o);
                        if (is.existy(response) && is.not.string(response)) return cb(response);

                        cb(new Error(is.empty(response) ? 'INVALID_RESPONSE' : new Error(response)));
                    }
                });
            } catch(e) {
                this.fail(e.toString());
                cb(e);
            }
        }
        else if (is.number(delay) && delay > 0)
            this._enqueue([ path, payload, timestamp > 0 ? timestamp : 0, cb ]);
        else cb(new Error('INVALID_SERVICE'));
    }

    /**
     * @description Closes client sockets
     * @memberof Client
     */
    disconnect() {
        for (let service of Object.keys(this._sockets))
            for (let id of Object.keys(this._sockets[service])) {
                this._sockets[service][id].close();
                this.warning(`${ service } @ ${ id } closed`);
            }
    }
}

module.exports = Client;
