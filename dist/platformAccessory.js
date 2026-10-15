"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BondAccessory = void 0;
const CeilingFanAccessory_1 = require("./accessories/CeilingFanAccessory");
const DeviceType_1 = require("./enum/DeviceType");
const FireplaceAccessory_1 = require("./accessories/FireplaceAccessory");
const GenericAccessory_1 = require("./accessories/GenericAccessory");
const LightAccessory_1 = require("./accessories/LightAccessory");
const ShadesAccessory_1 = require("./accessories/ShadesAccessory");
// eslint-disable-next-line @typescript-eslint/no-namespace
var BondAccessory;
(function (BondAccessory) {
    function create(platform, accessory, bond) {
        var _a;
        const device = accessory.context.device;
        const service = accessory.getService(platform.Service.AccessoryInformation);
        service
            .setCharacteristic(platform.Characteristic.Manufacturer, (_a = bond.version.make) !== null && _a !== void 0 ? _a : `Bond (${bond.version.target})`)
            // FirmwareRevision only supports semantic versioning, so the 'v' in the firmware version needs to be dropped
            .setCharacteristic(platform.Characteristic.FirmwareRevision, bond.version.fw_ver.replace('v', ''))
            // SerialNumber must be at least 2 characters. Use uniqueId to prevent warnings.
            .setCharacteristic(platform.Characteristic.SerialNumber, device.uniqueId);
        if (bond.version.model) {
            service
                .setCharacteristic(platform.Characteristic.Model, bond.version.model);
        }
        if (bond.version.mcu_ver) {
            service
                .setCharacteristic(platform.Characteristic.HardwareRevision, bond.version.mcu_ver);
        }
        switch (device.type) {
            case DeviceType_1.DeviceType.CeilingFan:
                return new CeilingFanAccessory_1.CeilingFanAccessory(platform, accessory, bond);
            case DeviceType_1.DeviceType.Generic:
                return new GenericAccessory_1.GenericAccessory(platform, accessory, bond);
            case DeviceType_1.DeviceType.Fireplace:
                return new FireplaceAccessory_1.FireplaceAccessory(platform, accessory, bond);
            case DeviceType_1.DeviceType.Shades:
                return new ShadesAccessory_1.ShadesAccessory(platform, accessory, bond);
            case DeviceType_1.DeviceType.Light:
                return new LightAccessory_1.LightAccessory(platform, accessory, bond);
            default: {
                throw 'Invalid Device Type';
            }
        }
    }
    BondAccessory.create = create;
})(BondAccessory || (exports.BondAccessory = BondAccessory = {}));
