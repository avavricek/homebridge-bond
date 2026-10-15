"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadesAccessory = void 0;
const Device_1 = require("../interface/Device");
const Observer_1 = require("../Observer");
const Services_1 = require("../Services");
class ShadesAccessory {
    constructor(platform, accessory, bond) {
        this.platform = platform;
        this.accessory = accessory;
        const device = accessory.context.device;
        this.windowCoveringService = new Services_1.WindowCoveringService(platform, accessory);
        if (platform.config.include_toggle_state) {
            this.toggleStateService = new Services_1.ButtonService(platform, accessory, 'Toggle State', 'ToggleState');
        }
        else {
            this.removeService('Toggle State');
        }
        if (Device_1.Device.MShasPreset(device)) {
            this.presetService = new Services_1.ButtonService(platform, accessory, 'Preset', 'Preset');
        }
        this.observe(bond);
    }
    updateState(state) {
        if (this.windowCoveringService) {
            // If position is available, use it, otherwise fall back to open state
            if (state.position !== undefined) {
                const device = this.accessory.context.device;
                // Determine if we should invert position values based on device subtype
                // Awnings use 0=closed, 100=open (same as HomeKit), so no inversion needed
                // Other shades use 0=open, 100=closed (opposite of HomeKit), so inversion is needed
                const shouldInvert = !Device_1.Device.MSisAwning(device);
                const homekitPosition = shouldInvert ? 100 - state.position : state.position;
                this.windowCoveringService.currentPosition.updateValue(homekitPosition);
                this.windowCoveringService.targetPosition.updateValue(homekitPosition);
            }
            else {
                this.windowCoveringService.currentPosition.updateValue(state.open === 1 ? 100 : 0);
                this.windowCoveringService.targetPosition.updateValue(state.open === 1 ? 100 : 0);
            }
        }
    }
    observe(bond) {
        const device = this.accessory.context.device;
        this.observeWindowCovering(bond, device);
        this.observePreset(bond, device);
        this.observeToggleState(bond, device);
    }
    observeWindowCovering(bond, device) {
        if (!Device_1.Device.MShasToggle(device)) {
            this.platform.error(this.accessory, 'ShadesAccessory does not have required ToggleOpen action.');
            return;
        }
        // Set initial state
        bond.api.getState(device.id).then(state => {
            this.updateState(state);
        });
        const props = {
            minValue: 0,
            maxValue: 100,
            minStep: Device_1.Device.MShasPosition(device) ? 1 : 100,
        };
        this.windowCoveringService.targetPosition.setProps(props);
        Observer_1.Observer.set(this.windowCoveringService.targetPosition, async (value) => {
            if (Device_1.Device.MShasPosition(device)) {
                // Determine if we should invert position values based on device subtype
                // Awnings use 0=closed, 100=open (same as HomeKit), so no inversion needed
                // Other shades use 0=open, 100=closed (opposite of HomeKit), so inversion is needed
                const shouldInvert = !Device_1.Device.MSisAwning(device);
                const bondPosition = shouldInvert ? 100 - value : value;
                await bond.api.setPosition(device, bondPosition)
                    .then(() => {
                    this.platform.debug(this.accessory, `Set position: ${bondPosition} (HomeKit: ${value})`);
                })
                    .catch((error) => {
                    this.platform.error(this.accessory, `Error setting position: ${error}`);
                });
            }
            else {
                // Intentional: RF shade devices without position support typically only
                // have a single toggle RF code — no discrete Open/Close signals exist.
                // ToggleOpen is the only available command for these devices.
                await bond.api.toggleOpen(device)
                    .then(() => {
                    this.platform.debug(this.accessory, `Toggled open: ${value}`);
                })
                    .catch((error) => {
                    this.platform.error(this.accessory, `Error toggling open: ${error}`);
                });
            }
        });
    }
    observePreset(bond, device) {
        if (!this.presetService) {
            return;
        }
        Observer_1.Observer.set(this.presetService.on, async (_) => {
            await bond.api.preset(device)
                .then(() => {
                this.platform.debug(this.accessory, 'Executed shade preset');
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error executing preset: ${error}`);
            });
        }, { resetToFalse: true });
    }
    observeToggleState(bond, device) {
        if (!this.toggleStateService) {
            return;
        }
        Observer_1.Observer.set(this.toggleStateService.on, async (_) => {
            await bond.api.toggleState(device, 'open')
                .then(() => {
                this.platform.debug(this.accessory, `${device.name} open state toggled`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error toggling open state: ${error}`);
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
exports.ShadesAccessory = ShadesAccessory;
