"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BPUPMethod = exports.Bond = void 0;
const BondApi_1 = require("../BondApi");
const axios_1 = __importDefault(require("axios"));
class Bond {
    formatAxiosError(error) {
        var _a, _b, _c, _d;
        const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
        const statusText = (_b = error.response) === null || _b === void 0 ? void 0 : _b.statusText;
        const code = (_c = error.code) !== null && _c !== void 0 ? _c : '';
        const message = (_d = error.message) !== null && _d !== void 0 ? _d : 'Unknown axios error';
        return `[status] ${status !== null && status !== void 0 ? status : 'N/A'} [statusText] ${statusText !== null && statusText !== void 0 ? statusText : 'N/A'} [code] ${code} [message] ${message}`;
    }
    constructor(platform, config) {
        this.platform = platform;
        this.deviceIds = [];
        this.accessories = [];
        this.config = config;
        this.api = new BondApi_1.BondApi(platform, config.token, config.ip_address, config.ms_between_actions, config.max_concurrent_requests);
    }
    // Helper to sanitze the config object into bond objects
    static objects(platform) {
        const config = platform.config;
        const bondData = config.bonds;
        const bondObjs = bondData.map(config => {
            return new Bond(platform, config);
        });
        return bondObjs;
    }
    // Helper to update the device ids of a group of bonds
    static validate(bonds) {
        const ps = [];
        bonds.forEach(bond => {
            ps.push(bond.validate());
        });
        return Promise.all(ps);
    }
    validate() {
        const bond = this;
        return this.api
            .ping()
            .then(() => {
            return bond;
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
                        this.platform.log.error(`A request error occurred: ${this.formatAxiosError(error)}`);
                }
            }
            else if (error.code === 'ECONNABORTED') {
                this.platform.log.error(`Unable to find Bond for IP Address: ${bond.config.ip_address}. Skipping this Bond.`);
            }
            else {
                this.platform.log.error(`A request error occurred: [code] ${(_a = error.code) !== null && _a !== void 0 ? _a : ''} [message] ${(_b = error.message) !== null && _b !== void 0 ? _b : 'Unknown error'}`);
            }
        });
    }
    // Helper to update the device ids of a group of bonds
    static updateDeviceIds(bonds) {
        const ps = [];
        bonds.forEach(bond => {
            ps.push(bond.updateDeviceIds());
            ps.push(bond.updateBondId());
        });
        return Promise.all(ps);
    }
    updateDeviceIds() {
        return this.api
            .getDeviceIds()
            .then(ids => {
            this.deviceIds = ids;
        })
            .catch(error => {
            this.platform.log.error(`Error getting device ids: ${error}`);
        });
    }
    updateBondId() {
        return this.api.getVersion()
            .then(version => {
            var _a, _b;
            this.version = version;
            this.platform.log.debug(`
****** Bond Info *******
 bondId: ${version.bondid}
 FW: ${version.fw_ver}
 API: v${version.api}
 Make: ${(_a = version.make) !== null && _a !== void 0 ? _a : 'N/A'}
 Model: ${(_b = version.model) !== null && _b !== void 0 ? _b : 'N/A'}\n************************`);
        })
            .catch(error => {
            this.platform.log.error(`Error getting version: ${error}`);
        });
    }
    // ID should be unique across multiple bonds in case device's have the same id across bonds.
    uniqueDeviceId(deviceId) {
        return `${this.version.bondid}${deviceId}`;
    }
    receivedBPUPPacket(packet) {
        this.accessories.forEach(accessory => {
            const device = accessory.accessory.context.device;
            // Topic structure is 'devices/[device_id]/state'
            if (packet.t
                && packet.t.includes(device.id)
                && packet.t.includes('state')
                && packet.b) {
                const state = packet.b;
                this.platform.debug(accessory.accessory, 'Received new state: ' + JSON.stringify(state));
                accessory.updateState(state);
            }
        });
    }
}
exports.Bond = Bond;
var BPUPMethod;
(function (BPUPMethod) {
    BPUPMethod[BPUPMethod["GET"] = 0] = "GET";
    BPUPMethod[BPUPMethod["POST"] = 1] = "POST";
    BPUPMethod[BPUPMethod["PUT"] = 2] = "PUT";
    BPUPMethod[BPUPMethod["DELETE"] = 3] = "DELETE";
    BPUPMethod[BPUPMethod["PATCH"] = 4] = "PATCH";
})(BPUPMethod || (exports.BPUPMethod = BPUPMethod = {}));
