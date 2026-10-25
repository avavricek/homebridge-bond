"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BondApi = void 0;
const Action_1 = require("./enum/Action");
const BondUri_1 = require("./BondUri");
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const flake_idgen_1 = __importDefault(require("flake-idgen"));
const http_1 = __importDefault(require("http"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const intformat = require('biguint-format');
var HTTPMethod;
(function (HTTPMethod) {
    HTTPMethod["GET"] = "get";
    HTTPMethod["PUT"] = "put";
    HTTPMethod["PATCH"] = "patch";
})(HTTPMethod || (HTTPMethod = {}));
const flakeIdGen = new flake_idgen_1.default();
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;
const READ_RETRIES = 10;
// Writes (actions/state changes) must fail fast: HomeKit gives up on a set
// after ~10s, so retrying for minutes only hides the failure.
const WRITE_RETRIES = 2;
class BondApi {
    formatAxiosError(error) {
        var _a, _b, _c, _d;
        const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
        const statusText = (_b = error.response) === null || _b === void 0 ? void 0 : _b.statusText;
        const code = (_c = error.code) !== null && _c !== void 0 ? _c : '';
        const message = (_d = error.message) !== null && _d !== void 0 ? _d : 'Unknown axios error';
        return `[status] ${status !== null && status !== void 0 ? status : 'N/A'} [statusText] ${statusText !== null && statusText !== void 0 ? statusText : 'N/A'} [code] ${code} [message] ${message}`;
    }
    constructor(platform, bondToken, ipAddress, ms_between_actions, max_concurrent_requests = DEFAULT_MAX_CONCURRENT_REQUESTS) {
        this.platform = platform;
        this.activeRequests = 0;
        this.pendingRequests = [];
        this.queueNextRequest = false;
        this.requestQueue = [];
        this.bondToken = bondToken;
        this.uri = new BondUri_1.BondUri(ipAddress);
        this.ms_between_actions = ms_between_actions;
        this.maxConcurrentRequests = max_concurrent_requests;
        // Use a dedicated client so retry interceptors don't stack on the global
        // axios instance (one per configured Bond).
        // Bonds close the TCP connection after each reply. Node 19+ reuses sockets
        // by default, so a follow-up request could go out on a socket the Bond
        // already closed (ECONNRESET / "socket hang up"). Use one connection per request.
        this.http = axios_1.default.create({
            httpAgent: new http_1.default.Agent({ keepAlive: false }),
        });
        (0, axios_retry_1.default)(this.http, {
            retries: READ_RETRIES,
            retryDelay: axios_retry_1.default.exponentialDelay,
            shouldResetTimeout: true,
            retryCondition: (error) => {
                var _a, _b, _c, _d;
                const method = (_b = (_a = error.config) === null || _a === void 0 ? void 0 : _a.method) === null || _b === void 0 ? void 0 : _b.toLowerCase();
                const isRead = method === undefined || method === HTTPMethod.GET;
                // Reads are safe to retry on anything transient. Writes are only retried
                // when the request never reached the Bond (connection refused/reset);
                // a 5xx or timeout means the Bond received it, so report it instead.
                const shouldRetry = isRead
                    ? axios_retry_1.default.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED'
                    : axios_retry_1.default.isNetworkError(error);
                if (shouldRetry) {
                    this.platform.log.warn(`Retrying ${(_c = method === null || method === void 0 ? void 0 : method.toUpperCase()) !== null && _c !== void 0 ? _c : 'request'} ${(_d = error.config) === null || _d === void 0 ? void 0 : _d.url}: ${this.formatAxiosError(error)}`);
                }
                return shouldRetry;
            },
        });
    }
    // Bond / Device Info
    getVersion() {
        return this.request(HTTPMethod.GET, this.uri.version());
    }
    getState(id) {
        return this.request(HTTPMethod.GET, this.uri.state(id));
    }
    getDeviceIds() {
        const req = this.request(HTTPMethod.GET, this.uri.deviceIds());
        return req.then(json => Object.keys(json).filter(x => {
            // Ignore anything that is an empty string or starts with underscores
            return x.length > 0 && !/^_+/.test(x);
        }));
    }
    getDevices(ids) {
        const ps = [];
        ids.forEach(id => {
            ps.push(this.getDevice(id));
        });
        return Promise.all(ps);
    }
    getDevice(id) {
        const req = this.request(HTTPMethod.GET, this.uri.device(id));
        return req.then(json => {
            // Set the id since it's not included in the response
            json.id = id;
            // get the properties of the device
            return this.getProperties(id).then(properties => {
                json.properties = properties;
                if (json.commands) {
                    // commands are only present on Bridge devices.
                    return this.getCommands(id).then(commands => {
                        json.commands = commands;
                        return json;
                    });
                }
                else {
                    return json;
                }
            });
        });
    }
    // Actions
    action(device, action, body = {}) {
        return this.ms_between_actions ?
            this.queueRequest(device, action, body) :
            this.request(HTTPMethod.PUT, this.uri.action(device.id, action), body);
    }
    queueRequest(device, action, body) {
        if (this.queueNextRequest) {
            this.requestQueue.push({ device, action, body });
        }
        else {
            this.queueNextRequest = true;
            this.request(HTTPMethod.PUT, this.uri.action(device.id, action), body);
            setTimeout(() => this.unQueueRequest(), this.ms_between_actions);
        }
        return Promise.resolve();
    }
    unQueueRequest() {
        const next = this.requestQueue.shift();
        if (next) {
            this.request(HTTPMethod.PUT, this.uri.action(next.device.id, next.action), next.body);
            setTimeout(() => this.unQueueRequest(), this.ms_between_actions);
        }
        else {
            this.queueNextRequest = false;
        }
    }
    toggleLight(device) {
        return this.action(device, Action_1.Action.ToggleLight);
    }
    toggleUpLight(device) {
        return this.action(device, Action_1.Action.ToggleUpLight);
    }
    toggleDownLight(device) {
        return this.action(device, Action_1.Action.ToggleDownLight);
    }
    startDimmer(device) {
        return this.action(device, Action_1.Action.StartDimmer);
    }
    startUpLightDimmer(device) {
        return this.action(device, Action_1.Action.StartUpLightDimmer);
    }
    startDownLightDimmer(device) {
        return this.action(device, Action_1.Action.StartDownLightDimmer);
    }
    startIncreasingBrightness(device) {
        return this.action(device, Action_1.Action.StartIncreasingBrightness);
    }
    startDecreasingBrightness(device) {
        return this.action(device, Action_1.Action.StartDecreasingBrightness);
    }
    setBrightness(device, value) {
        return this.action(device, Action_1.Action.SetBrightness, { argument: value });
    }
    setFlame(device, value) {
        return this.action(device, Action_1.Action.SetFlame, { argument: value });
    }
    turnLightOff(device) {
        return this.action(device, Action_1.Action.TurnLightOff);
    }
    toggleFan(device, on) {
        const action = on ? Action_1.Action.TurnOn : Action_1.Action.TurnOff;
        return this.action(device, action);
    }
    toggleDirection(device) {
        return this.action(device, Action_1.Action.ToggleDirection);
    }
    togglePower(device) {
        return this.action(device, Action_1.Action.TogglePower);
    }
    toggleOpen(device) {
        return this.action(device, Action_1.Action.ToggleOpen);
    }
    preset(device) {
        return this.action(device, Action_1.Action.Preset);
    }
    stop(device) {
        return this.request(HTTPMethod.PUT, this.uri.action(device.id, Action_1.Action.Stop));
    }
    setPosition(device, position) {
        return this.action(device, Action_1.Action.SetPosition, { argument: position });
    }
    setFanSpeed(device, speed) {
        return this.action(device, Action_1.Action.SetSpeed, { argument: speed });
    }
    increaseSpeed(device) {
        return this.action(device, Action_1.Action.IncreaseSpeed, { argument: 1 });
    }
    decreaseSpeed(device) {
        return this.action(device, Action_1.Action.DecreaseSpeed, { argument: 1 });
    }
    // State
    updateState(device, state) {
        return this.request(HTTPMethod.PATCH, this.uri.state(device.id), state);
    }
    // PATCH: Toggle state property for a device
    toggleState(device, property) {
        return this.getState(device.id)
            .then(state => {
            if (!state) {
                throw Error('Could not read the current state from the Bond');
            }
            if (property !== 'open' && property !== 'power' && property !== 'light' && property !== 'up_light' && property !== 'down_light') {
                throw Error(`This device does not have ${property} in it's Bond state`);
            }
            if (state[property] !== undefined) {
                const newState = {};
                newState[property] = state[property] === 1 ? 0 : 1;
                return this.updateState(device, newState);
            }
            else {
                throw Error(`This device does not have ${property} in it's Bond state`);
            }
        });
    }
    // Commands
    getCommands(deviceId) {
        return this.getCommandIds(deviceId).then(ids => {
            const ps = [];
            ids.forEach(id => {
                ps.push(this.getCommand(deviceId, id));
            });
            return Promise.all(ps);
        });
    }
    getCommandIds(id) {
        const req = this.request(HTTPMethod.GET, this.uri.commands(id));
        return req.then(json => Object.keys(json).filter(x => {
            // Ignore anything that is an empty string or starts with underscores
            return x.length > 0 && !/^_+/.test(x);
        }));
    }
    getCommand(deviceId, commandId) {
        return this.request(HTTPMethod.GET, this.uri.command(deviceId, commandId));
    }
    // Properties
    getProperties(id) {
        return this.request(HTTPMethod.GET, this.uri.properties(id));
    }
    // Helpers
    acquireRequestSlot() {
        if (this.activeRequests < this.maxConcurrentRequests) {
            this.activeRequests++;
            return Promise.resolve();
        }
        return new Promise(resolve => {
            this.pendingRequests.push(() => {
                this.activeRequests++;
                resolve();
            });
        });
    }
    releaseRequestSlot() {
        this.activeRequests--;
        const next = this.pendingRequests.shift();
        if (next) {
            next();
        }
    }
    ping() {
        const uuid = intformat(flakeIdGen.next(), 'hex', { prefix: '18', padstr: '0', size: 16 }); // avoid duplicate action
        const bondUuid = uuid.substring(0, 13) + uuid.substring(15); // remove '00' used for datacenter/worker in flakeIdGen
        return this.http({
            method: HTTPMethod.GET,
            url: this.uri.deviceIds(),
            headers: {
                'BOND-Token': this.bondToken,
                'Bond-UUID': bondUuid,
            },
            timeout: 2000,
        });
    }
    request(method, uri, body = {}) {
        const bodyStr = JSON.stringify(body);
        const uuid = intformat(flakeIdGen.next(), 'hex', { prefix: '18', padstr: '0', size: 16 }); // avoid duplicate action
        const bondUuid = uuid.substring(0, 13) + uuid.substring(15); // remove '00' used for datacenter/worker in flakeIdGen
        if (bodyStr !== '{}') {
            this.platform.log.debug(`Request (${bondUuid}) [${method} ${uri}] - body: ${bodyStr}`);
        }
        else {
            this.platform.log.debug(`Request (${bondUuid}) [${method} ${uri}]`);
        }
        return this.acquireRequestSlot()
            .then(() => this.http({
            method,
            url: uri,
            headers: {
                'BOND-Token': this.bondToken,
                'Bond-UUID': bondUuid,
            },
            data: body,
            timeout: 10000,
            'axios-retry': {
                retries: method === HTTPMethod.GET ? READ_RETRIES : WRITE_RETRIES,
            },
        }))
            .then(response => {
            this.platform.log.debug(`Response (${bondUuid}) [${method} ${uri}] - ${JSON.stringify(response.data)}`);
            return response.data;
        })
            .catch((error) => {
            var _a, _b;
            if (axios_1.default.isAxiosError(error) && error.response) {
                const response = error.response;
                switch (response.status) {
                    case 401:
                        this.platform.log.error('Unauthorized. Please check the `token` in your config to see if it is correct.');
                        return;
                    default:
                        this.platform.log.error(`A request error occurred [${method.toUpperCase()} ${uri}]: ${this.formatAxiosError(error)}`);
                }
            }
            else {
                const code = (_a = error.code) !== null && _a !== void 0 ? _a : '';
                const message = (_b = error.message) !== null && _b !== void 0 ? _b : 'Unknown error';
                this.platform.log.error(`A request error occurred [${method.toUpperCase()} ${uri}]: [code] ${code} [message] ${message}`);
            }
        })
            .finally(() => {
            this.releaseRequestSlot();
        });
    }
}
exports.BondApi = BondApi;
