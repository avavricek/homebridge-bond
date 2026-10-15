"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireplaceAccessory = void 0;
const Device_1 = require("../interface/Device");
const Observer_1 = require("../Observer");
const Services_1 = require("../Services");
class FireplaceAccessory {
    constructor(platform, accessory, bond) {
        this.platform = platform;
        this.accessory = accessory;
        this.flameService = new Services_1.FlameService(platform, accessory, accessory.displayName, 'Flame');
        if (platform.config.include_toggle_state) {
            this.toggleStateService = new Services_1.ButtonService(platform, accessory, 'Toggle State', 'ToggleState');
        }
        else {
            this.removeService('Toggle State');
        }
        this.observe(bond);
    }
    updateState(state) {
        this.flameService.updateState(state);
    }
    observe(bond) {
        const device = this.accessory.context.device;
        if (Device_1.Device.FPhasToggle(device)) {
            this.flameService.observe(this.platform, bond, this.accessory);
        }
        else {
            this.platform.error(this.accessory, 'FireplaceAccessory does not have required TogglePower action.');
        }
        this.observeToggle(bond);
        // Set initial state
        bond.api.getState(device.id).then(state => {
            this.updateState(state);
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
exports.FireplaceAccessory = FireplaceAccessory;
