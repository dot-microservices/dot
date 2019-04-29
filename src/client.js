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
        this._instances = [];
        this._sockets = {};
        this._serviceRegistry();
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

        const address = `${ ad.address }:${ ad.advertisement.port }`;
        this.logger.info(ad);
        this._instances.push(address);
        const socket = axon.socket('req');
        socket.connect(ad.advertisement.port, ad.address);
        socket._ts = Date.now();
        for (let service of ad.advertisement.services) {
            if (!this._sockets.hasOwnProperty(service)) this._sockets[service] = {};
            if (!this._sockets[service].hasOwnProperty(ad.id))
                this._sockets[service][ad.id] = socket;
        }
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

        this.logger.warn(ad);
        for (let service of ad.advertisement.services) {
            if (this._sockets.hasOwnProperty(service))
                if (this._sockets[service].hasOwnProperty(ad.id)) {
                    try {
                        this._sockets[service][ad.id].close();
                    } catch(e) {
                        this.logger.error(e);
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
     * @description Sends a request
     * @param {String} path service call
     * @param {Any} payload data
     * @param {Function} cb callback
     * @memberof Client
     */
    send(path, payload, cb) {
        if (is.not.function(cb)) cb = function() {};
        if (is.not.string(path) || is.empty(path))
            return is.function(cb) ? cb(new Error('INVALID_PATH')) : undefined;

        const delimiter = this.options.delimiter;
        const timeout = this.options.timeout, useTimeout = is.number(timeout) && timeout > 0;
        const service = path.split(is.string(delimiter) && is.not.empty(delimiter) ? delimiter : '.');
        if (service.length < 2) return is.function(cb) ? cb(new Error('MISSING_METHOD')): undefined;
        else if (!service[1].trim().length || service[1].charAt(0) === '_')
            return is.function(cb) ? cb(new Error('INVALID_METHOD')) : undefined;

        const socket = this._getSocket(service[0]);
        if (socket) {
            let t_o = null;
            try {
                if (useTimeout)
                    t_o = setTimeout(() => {
                        t_o = undefined;
                        if (is.function(cb)) cb(new Error('REQUEST_TIMEOUT'));
                    }, timeout);
                socket.send(path, payload, response => {
                    if (is.undefined(t_o) || is.not.function(cb)) return; // * timeout already fired!

                    if (t_o) clearTimeout(t_o);
                    if (is.existy(response) && is.not.string(response)) return cb(response);

                    cb(is.empty(response) ? new Error('INVALID_RESPONSE') : new Error(response));
                });
                socket._ts = Date.now();
            } catch(e) {
                this.logger.error(e);
                cb(e);
            }
        } else cb(new Error('INVALID_SERVICE'));
    }

    /**
     * @description Sends a clean shutdown request
     * @param {String} [target] service
     * @param {Function} [cb] callback
     * @memberof Client
     */
    shutdown(target, cb) {
        if (is.function(target)) {
            cb = target;
            target = undefined;
        }
        if (is.not.function(cb)) cb = () => null;
        for (let service of Object.keys(this._sockets))
            if (is.not.existy(target) || service === target)
                for (let id of Object.keys(this._sockets[service])) {
                    try {
                        this._sockets[service][id].send(this.COMMAND_CLEAN_SHUTDOWN, {});
                    } catch (e) {
                        this.logger.error(`${ service } @ ${ id } ${ e.message }`);
                    }
                }
        cb();
    }

    /**
     * @description Closes client sockets
     * @memberof Client
     */
    disconnect() {
        for (let service of Object.keys(this._sockets))
            for (let id of Object.keys(this._sockets[service])) {
                this._sockets[service][id].close();
                this.logger.warn(`${ service } @ ${ id } closed`);
            }
        if (this.ad) this.ad.stop();
        if (this.interval) clearInterval(this.interval);
        if (this.options.redis) {
            this.options.redis.unsubscribe();
            this.options.redis.disconnect();
        }
    }

    /**
     * @description Handles service registry procedure by provided options
     * @access private
     * @memberof Client
     */
    _serviceRegistry() {
        if (!this.options.hasOwnProperty('redis'))
            return this.advertise({ client: true }, this._serviceFound.bind(this), this._serviceLost.bind(this));

        if (is.not.function(this.options.redis.publish))
            throw new Error('redis parameter must be an instance of ioredis client');

        this.options.redis.on('message', (channel, ad) => {
            try {
                ad = JSON.parse(ad);
                if (channel === 'up') this._serviceFound(ad);
                else if (channel === 'down') this._serviceLost(ad);
            } catch (e) {
                return;
            }
        });

        this.options.redis.subscribe('up', 'down');
        this.interval = setInterval(() => this._interval(), this.getPeriodInMS());
    }

    /**
     * @description Background task for ping / pong
     * @private
     * @memberof Client
     */
    _interval() {
        const expire = is.number(this.options.ping) ? this.options.ping : this.getPeriodInMS() * 3;
        for (let service of Object.keys(this._sockets)) {
            if (is.object(this._sockets[service]) && is.not.empty(this._sockets[service])) {
                for (let id of Object.keys(this._sockets[service])) {
                    const socket = this._sockets[service][id];
                    if (socket && socket._ts) {
                        const diff = Date.now() - socket._ts;
                        if (diff > expire) this._ping(socket);
                    }
                }
            }
        }
    }

    /**
     * @description sends ping request
     * @param {axon.socket} socket
     * @param {function} cb callback
     * @private
     * @memberof Client
     */
    _ping(socket, cb) {
        if (is.not.function(cb)) cb = () => {};
        socket.send(this.COMMAND_PING, {}, cb);
        socket._ts = Date.now();
    }
}

module.exports = Client;
