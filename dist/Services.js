"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlameService = exports.WindowCoveringService = exports.ButtonService = exports.SwitchService = exports.LightbulbService = exports.FanService = void 0;
const Device_1 = require("./interface/Device");
const Observer_1 = require("./Observer");
class FanService {
    constructor(platform, accessory) {
        let service = accessory.getService(platform.Service.Fan);
        const device = accessory.context.device;
        if (service === undefined) {
            service = accessory.addService(platform.Service.Fan, accessory.displayName);
        }
        this.on = service.getCharacteristic(platform.Characteristic.On);
        if (Device_1.Device.canSetSpeed(device)) {
            this.rotationSpeed = service.getCharacteristic(platform.Characteristic.RotationSpeed);
        }
        if (Device_1.Device.hasReverseSwitch(device)) {
            this.rotationDirection = service.getCharacteristic(platform.Characteristic.RotationDirection);
        }
    }
}
exports.FanService = FanService;
class LightbulbService {
    constructor(platform, accessory, name, subType) {
        let service = accessory.getService(platform.Service.Lightbulb);
        const device = accessory.context.device;
        if (subType) {
            service = accessory.getServiceById(platform.Service.Lightbulb, subType);
        }
        if (service === undefined) {
            service = accessory.addService(platform.Service.Lightbulb, name, subType);
        }
        this.on = service.getCharacteristic(platform.Characteristic.On);
        const brightness = service.getCharacteristic(platform.Characteristic.Brightness);
        if (Device_1.Device.LThasBrightness(device)) {
            this.brightness = brightness;
        }
        else {
            // Fixing bug from 3.1.0 where brightness was added to lights unintentionally
            service.removeCharacteristic(brightness);
        }
        this.subType = subType;
    }
    updateState(state) {
        if (this.subType === 'UpLight') {
            this.on.updateValue(state.up_light === 1 && state.light === 1);
        }
        else if (this.subType === 'DownLight') {
            this.on.updateValue(state.down_light === 1 && state.light === 1);
        }
        else {
            this.on.updateValue(state.light === 1);
        }
        if (this.brightness && state.brightness) {
            this.brightness.updateValue(state.brightness);
        }
    }
    observe(platform, bond, accessory) {
        const device = accessory.context.device;
        this.observeLight(platform, bond, device, accessory);
        this.observeLightBrightness(platform, bond, device, accessory);
    }
    observeLight(platform, bond, device, accessory) {
        Observer_1.Observer.set(this.on, async (value) => {
            let promise;
            const subtype = this.subType;
            if (subtype === 'UpLight') {
                promise = bond.api.toggleUpLight(device);
            }
            else if (subtype === 'DownLight') {
                promise = bond.api.toggleDownLight(device);
            }
            else {
                promise = bond.api.toggleLight(device);
            }
            await promise
                .then(() => {
                platform.debug(accessory, `Set light power: ${value}`);
            })
                .catch((error) => {
                platform.error(accessory, `Error setting light power: ${error}`);
            });
        });
    }
    observeLightBrightness(platform, bond, device, accessory) {
        if (!this.brightness) {
            return;
        }
        Observer_1.Observer.set(this.brightness, async (value) => {
            if (value === 0) {
                // Value of 0 is the same as turning the light off. 
                // Ignore and return.
                return;
            }
            await bond.api.setBrightness(device, value)
                .then(() => {
                platform.debug(accessory, `Set light brightness: ${value}`);
            })
                .catch((error) => {
                platform.error(accessory, `Error setting light brightness: ${error}`);
            });
        });
    }
}
exports.LightbulbService = LightbulbService;
class SwitchService {
    constructor(platform, accessory, name, subType) {
        // Check for service by subtype
        let service = accessory.getServiceById(platform.Service.Switch, subType);
        if (service === undefined) {
            service = accessory.addService(platform.Service.Switch, name, subType);
        }
        // Set the subtype if not defined
        if (service.subtype === undefined) {
            service.subtype = subType;
        }
        this.on = service.getCharacteristic(platform.Characteristic.On);
        this.subType = subType;
    }
}
exports.SwitchService = SwitchService;
// ButtonService is a switch that resets itself after 500ms. This provides a 
// button like experience that isn't available in homebridge.
class ButtonService {
    constructor(platform, accessory, name, subType) {
        // Check for service by subtype
        let service = accessory.getServiceById(platform.Service.Switch, subType);
        if (service === undefined) {
            service = accessory.addService(platform.Service.Switch, name, subType);
        }
        // Set the subtype if not defined
        if (service.subtype === undefined) {
            service.subtype = subType;
        }
        this.on = service.getCharacteristic(platform.Characteristic.On);
        this.on.setValue(false);
        this.subType = subType;
    }
}
exports.ButtonService = ButtonService;
class WindowCoveringService {
    constructor(platform, accessory) {
        let service = accessory.getService(platform.Service.WindowCovering);
        if (service === undefined) {
            service = accessory.addService(platform.Service.WindowCovering, accessory.displayName);
        }
        this.currentPosition = service.getCharacteristic(platform.Characteristic.CurrentPosition);
        this.targetPosition = service.getCharacteristic(platform.Characteristic.TargetPosition);
        this.positionState = service.getCharacteristic(platform.Characteristic.PositionState);
    }
}
exports.WindowCoveringService = WindowCoveringService;
class FlameService {
    constructor(platform, accessory, name, subType) {
        const device = accessory.context.device;
        let service;
        // If the device has a flame, treat it as a Lightbulb
        if (Device_1.Device.FPhasFlame(device)) {
            service = accessory.getService(platform.Service.Lightbulb);
            if (subType) {
                service = accessory.getServiceById(platform.Service.Lightbulb, subType);
            }
            if (service === undefined) {
                service = accessory.addService(platform.Service.Lightbulb, name, subType);
            }
            const flame = service.getCharacteristic(platform.Characteristic.Brightness);
            this.flame = flame;
        }
        else {
            // Otherwise, treat it as a Switch
            service = accessory.getService(platform.Service.Switch);
            if (subType) {
                service = accessory.getServiceById(platform.Service.Switch, subType);
            }
            if (service === undefined) {
                service = accessory.addService(platform.Service.Switch, name, subType);
            }
        }
        this.on = service.getCharacteristic(platform.Characteristic.On);
    }
    updateState(state) {
        if (state.power !== undefined) {
            this.on.updateValue(state.power === 1);
        }
        if (this.flame && state.flame !== undefined) {
            this.flame.updateValue(state.flame);
        }
    }
    observe(platform, bond, accessory) {
        const device = accessory.context.device;
        this.observePower(platform, bond, device, accessory);
        this.observeFlame(platform, bond, device, accessory);
    }
    observePower(platform, bond, device, accessory) {
        Observer_1.Observer.set(this.on, async (value) => {
            await bond.api.togglePower(device)
                .then(() => {
                platform.debug(accessory, `Set flame power: ${value}`);
            })
                .catch((error) => {
                platform.error(accessory, `Error setting flame power: ${error}`);
            });
        });
    }
    observeFlame(platform, bond, device, accessory) {
        if (!this.flame) {
            return;
        }
        Observer_1.Observer.set(this.flame, async (value) => {
            if (value === 0) {
                // Value of 0 is the same as turning the flame off. 
                // Ignore and return.
                return;
            }
            await bond.api.setFlame(device, value)
                .then(() => {
                platform.debug(accessory, `Set flame brightness: ${value}`);
            })
                .catch((error) => {
                platform.error(accessory, `Error setting flame brightness: ${error}`);
            });
        });
    }
}
exports.FlameService = FlameService;
