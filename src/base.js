'use strict';

const discover = require('node-discover');
const is = require('is_js');
const pino = require('pino');

/**
 * @description Base class for Client and Server
 * @class Base
 */
class Base {
    /**
     * Creates an instance of Base.
     * @param {Object} options
     * @memberof Base
     */
    constructor(options) {
        this.COMMAND_CLEAN_SHUTDOWN = '#CS#';
        this.COMMAND_PING = '#PI#';
        this.COMMAND_PONG = '#PO#';
        this.options = { delimiter: '.', iface: 'eth0', logs: 'error', secret: 'dot' };
        if (is.object(options) && is.not.array(options))
            this.options = Object.assign(this.options, options);
        this.logger = pino({ level: this.options.log || this.options.logs });
    }

    /**
     * @description Initiates auto discovery feature
     * @param {Object} options
     * @param {Function} added onAdded handler function
     * @param {Function} removed onRemoved handler function
     * @access private
     * @memberof Base
     */
    advertise(options, added, removed) {
        let advertising = { key: this.options.secret };
        if (is.object(options)) advertising = Object.assign(advertising, options);
        if (is.object(this.options.discover))
            advertising = Object.assign(advertising, this.options.discover);
        this.ad = discover(advertising);
        if (is.function(added)) this.ad.on('added', added);
        if (is.function(removed)) this.ad.on('removed', removed);
    }

    /**
     * @description Makes service name camel-case
     * @param {String} service service class
     * @access private
     * @memberof Base
     */
    fixServiceName(service) {
        if (service.hasOwnProperty('_name') && is.function(service._name)) return service._name();

        return `${ service.name.charAt(0).toLowerCase() }${ service.name.slice(1) }`;
    }

    /**
     * @description Returns interval time in milliseconds
     * @returns Number
     * @private
     * @memberof Base
     */
    getPeriodInMS() {
        return is.object(this.options.discover) ? this.options.discover.checkInterval || 3000 : 3000;
    }
}

module.exports = Base;
