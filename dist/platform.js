"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BondPlatform = void 0;
const Bond_1 = require("./interface/Bond");
const platformAccessory_1 = require("./platformAccessory");
const config_1 = require("./interface/config");
const Device_1 = require("./interface/Device");
const settings_1 = require("./settings");
const dgram_1 = __importDefault(require("dgram"));
class BondPlatform {
    redactConfig(config) {
        const cast = config;
        if (!cast.bonds || !Array.isArray(cast.bonds)) {
            return config;
        }
        const redactedBonds = cast.bonds.map(bond => {
            return {
                ...bond,
                token: '[REDACTED]',
            };
        });
        return {
            ...config,
            bonds: redactedBonds,
        };
    }
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.UUIDGen = this.api.hap.uuid;
        this.accessories = [];
        if (config === null) {
            this.log.error('No config defined.');
            return;
        }
        if (!config_1.BondPlatformConfig.isValid(this)) {
            this.log.error(`Config: ${JSON.stringify(this.redactConfig(config), null, 2)}`);
            return;
        }
        this.log.debug(`Config: ${JSON.stringify(this.redactConfig(config), null, 2)}`);
        api.on('didFinishLaunching', () => {
            // Delaying the initialization of bonds property because we need to
            // get the device ids before doing anything
            this.validateBonds();
        });
    }
    // Validate that all of the bonds provided in the config are online and authenticaiton is working
    validateBonds() {
        const bonds = Bond_1.Bond.objects(this);
        const validated = [];
        Bond_1.Bond.validate(bonds).then(res => {
            res.forEach(res => {
                if (res !== undefined) {
                    validated.push(res);
                }
            });
            this.setupBonds(validated);
        });
    }
    setupBonds(bonds) {
        if (bonds.length === 0) {
            this.log.warn('No valid Bonds available.');
            return;
        }
        // const bonds = Bond.objects(this);
        Bond_1.Bond.updateDeviceIds(bonds).then(() => {
            this.bonds = bonds;
            this.log(`${this.accessories.length} cached accessories were loaded`);
            this.bonds.forEach(bond => {
                this.getDevices(bond);
                this.setupBPUP(bond);
            });
        });
    }
    getDevices(bond) {
        this.cleanupBondData(bond);
        this.log(`Getting devices for this Bond (${bond.version.bondid})...`);
        this.log(`${bond.deviceIds.length} devices were found on this Bond (${bond.version.bondid}).`);
        const filtered = bond.deviceIds.filter(deviceId => {
            const accessories = this.accessories.filter(acc => {
                return acc.context.device.uniqueId === bond.uniqueDeviceId(deviceId);
            });
            return accessories.length === 0;
        });
        if (filtered.length === 0) {
            this.log(`No new devices to add for this Bond (${bond.version.bondid}).`);
            return;
        }
        this.log(`Attempting to add ${filtered.length} devices that were not previously added.`);
        bond.api
            .getDevices(filtered)
            .then(devices => {
            devices.forEach(device => {
                // Set the unique id
                device.uniqueId = bond.uniqueDeviceId(device.id);
                // Set the bond id
                device.bondId = bond.version.bondid;
            });
            this.addAccessories(devices);
        })
            .catch(error => {
            this.log(`Error getting devices: ${error}`);
        });
    }
    cleanupBondData(bond) {
        // Data cleanup - Make sure all cached devices have uniqueId and bondId on them
        bond.deviceIds.forEach(deviceId => {
            this.accessories.forEach(accessory => {
                // Only run if device does not have uniqueId
                if (accessory.context.device.uniqueId === undefined
                    && accessory.context.device.id === deviceId) {
                    const uniqueId = bond.uniqueDeviceId(deviceId);
                    this.log.debug(`Updating device data with uniqueId ${uniqueId}`);
                    accessory.context.device.uniqueId = bond.uniqueDeviceId(deviceId);
                    accessory.context.device.bondId = bond.version.bondid;
                }
            });
        });
    }
    addAccessories(devices) {
        devices.forEach(device => {
            this.addAccessory(device);
        });
    }
    // Accessory
    /**
     * Add a new accessory that hasn't been added before.
     */
    addAccessory(device) {
        const bond = this.bondForDevice(device);
        // Make sure Bond exists
        if (bond === undefined) {
            this.log(`[${device.name}] Bond does not exist for device id: ${device.id}.`);
            return;
        }
        // Make sure device shouldn't be excluded
        if ((bond.config.hide_device_ids !== undefined
            && bond.config.hide_device_ids.includes(device.id))) {
            this.log(`[${device.name}] Excluding ${device.id}.`);
            return;
        }
        // Make sure device has supported actions
        if (!Device_1.Device.isSupported(device)) {
            this.log(`[${device.name}] Device has no supported actions.`);
            return;
        }
        const uuid = this.UUIDGen.generate(device.uniqueId);
        if (this.accessoryAdded(uuid)) {
            this.log(`[${device.name}] Accessory already added.`);
            return;
        }
        const displayName = Device_1.Device.displayName(device);
        const accessory = new this.api.platformAccessory(`${displayName}`, uuid);
        accessory.context.device = device;
        this.create(accessory);
        this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);
        this.log(`Adding Accessory ${accessory.displayName}`);
        this.log.debug(`Device unique id: ${device.uniqueId}`);
    }
    removeAccessory(accessory) {
        this.log(`Removing Accessory: ${accessory.displayName}`);
        const index = this.accessories.indexOf(accessory);
        if (index > -1) {
            this.accessories.splice(index, 1);
        }
        this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
    }
    configureAccessory(accessory) {
        if (this.config === null || this.config.bonds === undefined) {
            return;
        }
        this.accessories.push(accessory);
        // If bonds hasn't been initilized, attempt to configure the accessory
        // after a delay
        if (this.bonds) {
            this.log(`Configuring Accessory: ${accessory.displayName}`);
            this.create(accessory);
        }
        else {
            const that = this;
            const timer = setInterval(() => {
                if (this.bonds) {
                    that.log(`Configuring Accessory: ${accessory.displayName}`);
                    that.create(accessory);
                    clearInterval(timer);
                }
            }, 500);
        }
    }
    create(accessory) {
        const device = accessory.context.device;
        const bond = this.bondForDevice(device);
        if (!bond) {
            return;
        }
        if ((bond.config.hide_device_ids
            && bond.config.hide_device_ids.includes(device.id))) {
            this.removeAccessory(accessory);
            return;
        }
        this.logAccessory(accessory, `actions: ${device.actions}`);
        const bondAccessory = platformAccessory_1.BondAccessory.create(this, accessory, bond);
        bond.accessories.push(bondAccessory);
    }
    setupBPUP(bond) {
        const PORT = 30007;
        const HOST = this.bpupHost(bond.config.ip_address);
        const message = Buffer.from('');
        const client = dgram_1.default.createSocket('udp4');
        const log = this.log;
        function send() {
            client.send(message, 0, message.length, PORT, HOST, (err) => {
                if (err) {
                    log.error(`Error sending UDP message: ${err}`);
                    return;
                }
                log.debug(`UDP message sent to ${HOST}:${PORT}`);
            });
        }
        send();
        // From Bond API Docs: The client should continue to send the Keep-Alive datagram on 
        // the same socket every 60 seconds to keep the connection active.
        setInterval(send, 1000 * 60);
        client.on('message', (message, remote) => {
            const msg = message.toString().trim();
            const packet = this.parseBPUPPacket(msg);
            if (packet) {
                log.debug(`UDP Message received from ${remote.address}:${remote.port} - ${msg}`);
                bond.receivedBPUPPacket(packet);
            }
            else {
                log.debug(`Malformed UDP payload from ${remote.address}:${remote.port}. Ignoring packet.`);
            }
        });
        client.on('close', () => {
            this.log('Connection closed');
        });
    }
    bpupHost(ipAddress) {
        return new URL(`http://${ipAddress}`).hostname;
    }
    parseBPUPPacket(message) {
        const jsonStart = message.indexOf('{');
        if (jsonStart === -1) {
            return undefined;
        }
        try {
            return JSON.parse(message.slice(jsonStart));
        }
        catch (_error) {
            return undefined;
        }
    }
    bondForDevice(device) {
        if (this.bonds) {
            const bond = this.bonds.find(x => x.version.bondid === device.bondId && x.deviceIds.includes(device.id));
            if (bond === undefined) {
                this.log.error(`No Bond found for Device: ${device.name}.
          This Device may have been removed from your Bond but still exists in cachedAccessories.`);
            }
            return bond;
        }
        else {
            this.log.error('config.bonds is not defined');
        }
    }
    // Helper Methods
    accessoryAdded(uuid) {
        const accessories = this.accessories.filter(acc => {
            return acc.UUID === uuid;
        });
        return accessories.length > 0;
    }
    debug(accessory, message) {
        const device = accessory.context.device;
        this.log.debug(`[${device.name}] ${message}`);
    }
    logAccessory(accessory, message) {
        const device = accessory.context.device;
        this.log(`[${device.name}] ${message}`);
    }
    error(accessory, message) {
        const device = accessory.context.device;
        this.log.error(`[${device.name}] ${message}`);
    }
}
exports.BondPlatform = BondPlatform;
