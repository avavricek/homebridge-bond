"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightAccessory = void 0;
const Device_1 = require("../interface/Device");
const Observer_1 = require("../Observer");
const Services_1 = require("../Services");
class LightAccessory {
    constructor(platform, accessory, bond) {
        this.platform = platform;
        this.accessory = accessory;
        this.lightService = new Services_1.LightbulbService(platform, accessory, accessory.displayName);
        if (platform.config.include_toggle_state) {
            this.toggleLightService = new Services_1.ButtonService(platform, accessory, 'Toggle Light State', 'ToggleState');
        }
        else {
            this.removeService('Toggle Light State');
        }
        this.observe(bond);
    }
    updateState(state) {
        this.lightService.updateState(state);
    }
    observe(bond) {
        const device = this.accessory.context.device;
        if (Device_1.Device.LThasLightbulb(device)) {
            this.lightService.observe(this.platform, bond, this.accessory);
        }
        else {
            this.platform.error(this.accessory, 'LightAccessory does not have required ToggleLight action.');
        }
        this.observeLightToggle(bond, device);
    }
    observeLightToggle(bond, device) {
        if (!this.toggleLightService) {
            return;
        }
        Observer_1.Observer.set(this.toggleLightService.on, async (_) => {
            await bond.api.toggleState(device, 'light')
                .then(() => {
                this.platform.debug(this.accessory, `${device.name} light state toggled`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error toggling light state: ${error}`);
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
exports.LightAccessory = LightAccessory;
