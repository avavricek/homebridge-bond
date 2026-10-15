"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericAccessory = void 0;
const Device_1 = require("../interface/Device");
const Observer_1 = require("../Observer");
const Services_1 = require("../Services");
class GenericAccessory {
    constructor(platform, accessory, bond) {
        this.platform = platform;
        this.accessory = accessory;
        this.switchService = new Services_1.SwitchService(platform, accessory, accessory.displayName, 'Power');
        if (platform.config.include_toggle_state) {
            this.toggleStateService = new Services_1.ButtonService(platform, accessory, 'Toggle State', 'ToggleState');
        }
        else {
            this.removeService('Toggle State');
        }
        this.observe(bond);
        this.observeToggle(bond);
    }
    updateState(state) {
        this.switchService.on.updateValue(state.power === 1);
    }
    observe(bond) {
        const device = this.accessory.context.device;
        if (!Device_1.Device.GXhasToggle(device)) {
            this.platform.error(this.accessory, 'GenericAccessory does not have required TogglePower action.');
            return;
        }
        // Set initial state
        bond.api.getState(device.id).then(state => {
            this.updateState(state);
        });
        Observer_1.Observer.set(this.switchService.on, async (value) => {
            await bond.api.togglePower(device)
                .then(() => {
                this.platform.debug(this.accessory, `Toggled power: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error toggling power: ${error}`);
            });
        });
    }
    observeToggle(bond) {
        if (!this.toggleStateService) {
            return;
        }
        const device = this.accessory.context.device;
        Observer_1.Observer.set(this.toggleStateService.on, async (_) => {
            await bond.api.toggleState(device, 'power')
                .then(() => {
                this.platform.debug(this.accessory, `${device.name} power state toggled`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error toggling power state: ${error}`);
            });
        }, { resetToFalse: true });
    }
    removeService(serviceName) {
        const service = this.accessory.getService(serviceName);
        if (service) {
            this.accessory.removeService(service);
        }
    }
}
exports.GenericAccessory = GenericAccessory;
