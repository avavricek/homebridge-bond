"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CeilingFanAccessory = void 0;
const Device_1 = require("../interface/Device");
const Services_1 = require("../Services");
const Observer_1 = require("../Observer");
class CeilingFanAccessory {
    constructor(platform, accessory, bond) {
        var _a;
        const config = platform.config;
        this.platform = platform;
        this.accessory = accessory;
        const fanSpeedValues = config.fan_speed_values;
        const includeDimmer = config.include_dimmer;
        const includeToggle = config.include_toggle_state;
        const device = accessory.context.device;
        this.values = Device_1.Device.fanSpeeds(device);
        this.minStep = Math.floor(100 / this.values.length);
        this.maxValue = this.minStep * this.values.length;
        if (fanSpeedValues) {
            this.minStep = 1;
            this.maxValue = this.values.length;
        }
        this.fanService = new Services_1.FanService(platform, accessory);
        if (((_a = device.properties) === null || _a === void 0 ? void 0 : _a.max_speed) === undefined) {
            if (Device_1.Device.canIncreaseDecreaseSpeed(device)) {
                this.increaseSpeedService = new Services_1.ButtonService(platform, accessory, `${accessory.displayName} Increase Speed`, 'IncreaseSpeed');
                this.decreaseSpeedService = new Services_1.ButtonService(platform, accessory, `${accessory.displayName} Decrease Speed`, 'DecreaseSpeed');
            }
            else {
                this.removeService(`${accessory.displayName} Increase Speed`);
                this.removeService(`${accessory.displayName} Decrease Speed`);
                this.platform.error(accessory, 'Fan Speed is not supported (missing max_speed property or IncreaseSpeed/DescreaseSpeed actions).');
            }
        }
        if (Device_1.Device.CFhasUpDownLight(device)) {
            this.upLightService = new Services_1.LightbulbService(platform, accessory, `${accessory.displayName} Up Light`, 'UpLight');
            this.downLightService = new Services_1.LightbulbService(platform, accessory, `${accessory.displayName} Down Light`, 'DownLight');
            if (includeToggle) {
                this.toggleUpLightService = new Services_1.ButtonService(platform, accessory, 'Toggle Up Light State', 'ToggleUpLight');
                this.toggleDownLightService = new Services_1.ButtonService(platform, accessory, 'Toggle Down Light State', 'ToggleDownLight');
            }
            else {
                // Remove services if previously added
                this.removeService('Toggle Up Light State');
                this.removeService('Toggle Down Light State');
            }
            if (includeDimmer && Device_1.Device.HasDimmer(device)) {
                this.upLightDimmerService = new Services_1.SwitchService(platform, accessory, `${accessory.displayName} Up Light Dimmer`, 'UpLight');
                this.downLightDimmerService = new Services_1.SwitchService(platform, accessory, `${accessory.displayName} Down Light Dimmer`, 'DownLight');
            }
            else {
                // Remove services if previously added
                this.removeService(`${accessory.displayName} Up Light Dimmer`);
                this.removeService(`${accessory.displayName} Down Light Dimmer`);
            }
        }
        else if (Device_1.Device.CFhasLightbulb(device)) {
            this.lightService = new Services_1.LightbulbService(platform, accessory, `${accessory.displayName} Light`);
            if (includeToggle) {
                this.toggleLightService = new Services_1.ButtonService(platform, accessory, 'Toggle Light State', 'ToggleState');
            }
            else {
                this.removeService('Toggle Light State');
            }
            if (includeDimmer && Device_1.Device.HasDimmer(device)) {
                this.dimmerService = new Services_1.SwitchService(platform, accessory, `${accessory.displayName} Dimmer`, 'Dimmer');
            }
            else {
                // Remove service if previously added
                this.removeService(`${accessory.displayName} Dimmer`);
            }
        }
        if (includeDimmer && Device_1.Device.HasSeparateDimmers(device)) {
            this.increaseBrightnessService = new Services_1.SwitchService(platform, accessory, `${accessory.displayName} Increase Brightness`, 'IncreaseBrightness');
            this.decreaseBrightnessService = new Services_1.SwitchService(platform, accessory, `${accessory.displayName} Decrease Brightness`, 'DecreaseBrightness');
        }
        else {
            // Remove service if previously added
            this.removeService(`${accessory.displayName} Increase Brightness`);
            this.removeService(`${accessory.displayName} Decrease Brightness`);
        }
        this.observe(bond);
    }
    updateState(state) {
        // Power
        this.fanService.on.updateValue(state.power === 1);
        // Speed
        if (this.fanService.rotationSpeed) {
            let value = 0;
            if (state.speed && state.power === 1) {
                const index = this.values.indexOf(state.speed) + 1;
                const step = index * this.minStep;
                value = step;
            }
            this.fanService.rotationSpeed.updateValue(value);
        }
        // Rotation direction
        if (this.fanService.rotationDirection) {
            let direction = 0;
            if (state.direction) {
                // Bond state direction is 1 / -1, Homekit direction is 1 / 0
                direction = state.direction === 1 ? 1 : 0;
                this.fanService.rotationDirection.updateValue(direction);
            }
        }
        // Light
        if (this.lightService) {
            this.lightService.updateState(state);
        }
        // Up Light
        if (this.upLightService) {
            this.upLightService.updateState(state);
        }
        // Down Light
        if (this.downLightService) {
            this.downLightService.updateState(state);
        }
    }
    observe(bond) {
        const device = this.accessory.context.device;
        this.observeFanPower(bond, device);
        this.observeFanSpeed(bond, device);
        this.observeFanDirection(bond, device);
        this.observeFanIncreaseSpeed(bond, device);
        this.observeFanDecreaseSpeed(bond, device);
        if (this.lightService) {
            this.lightService.observe(this.platform, bond, this.accessory);
        }
        this.observeLightToggle(bond, device, this.toggleLightService);
        this.observeLightDimmer(bond, device, this.dimmerService);
        if (this.upLightService) {
            this.upLightService.observe(this.platform, bond, this.accessory);
        }
        this.observeLightToggle(bond, device, this.toggleUpLightService);
        this.observeLightDimmer(bond, device, this.upLightDimmerService);
        if (this.downLightService) {
            this.downLightService.observe(this.platform, bond, this.accessory);
        }
        this.observeLightToggle(bond, device, this.toggleDownLightService);
        this.observeLightDimmer(bond, device, this.downLightDimmerService);
        this.observeLightIncreaseBrightness(bond, device, this.decreaseBrightnessService);
        this.observeLightDecreaseBrightness(bond, device, this.increaseBrightnessService);
        // Set initial state
        bond.api.getState(device.id).then(state => {
            this.updateState(state);
        });
    }
    observeFanPower(bond, device) {
        if (!Device_1.Device.hasOffOn(device)) {
            this.platform.error(this.accessory, 'CeilingFanAccessory does not have required actions for fan service.');
            return;
        }
        Observer_1.Observer.set(this.fanService.on, async (value) => {
            await bond.api.toggleFan(device, value)
                .then(() => {
                this.platform.debug(this.accessory, `Set fan power: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error setting fan power: ${error}`);
            });
        });
    }
    observeFanSpeed(bond, device) {
        if (!this.fanService.rotationSpeed) {
            return;
        }
        const props = {
            maxValue: this.maxValue,
            minStep: this.minStep,
        };
        this.fanService.rotationSpeed.setProps(props);
        Observer_1.Observer.set(this.fanService.rotationSpeed, async (step) => {
            if (step === 0) {
                // Step of 0 is the same as turning the fan off. This is handled in the fan power observer
                return;
            }
            const index = step / this.minStep - 1;
            const speed = this.values[index];
            await bond.api.setFanSpeed(device, speed)
                .then(() => {
                this.platform.debug(this.accessory, `Set fan speed: ${speed}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error setting fan speed: ${error}`);
            });
        });
    }
    observeFanDirection(bond, device) {
        if (!this.fanService.rotationDirection) {
            return;
        }
        Observer_1.Observer.set(this.fanService.rotationDirection, async (value) => {
            await bond.api.toggleDirection(device)
                .then(() => {
                this.platform.debug(this.accessory, `Set fan direction: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error setting fan direction: ${error}`);
            });
        });
    }
    observeFanIncreaseSpeed(bond, device) {
        if (!this.increaseSpeedService) {
            return;
        }
        Observer_1.Observer.set(this.increaseSpeedService.on, async (value) => {
            await bond.api.increaseSpeed(device)
                .then(() => {
                this.platform.debug(this.accessory, `Increased fan speed: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error increasing fan speed: ${error}`);
            });
        }, { resetToFalse: true });
    }
    observeFanDecreaseSpeed(bond, device) {
        if (!this.decreaseSpeedService) {
            return;
        }
        Observer_1.Observer.set(this.decreaseSpeedService.on, async (value) => {
            await bond.api.decreaseSpeed(device)
                .then(() => {
                this.platform.debug(this.accessory, `Decreased fan speed: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error decreasing fan speed: ${error}`);
            });
        }, { resetToFalse: true });
    }
    observeLightToggle(bond, device, service) {
        if (!service) {
            return;
        }
        Observer_1.Observer.set(service.on, async (_) => {
            let promise;
            const subtype = service.subType;
            if (subtype === 'UpLight' || subtype === 'ToggleUpLight') {
                promise = bond.api.toggleState(device, 'up_light');
            }
            else if (subtype === 'DownLight' || subtype === 'ToggleDownLight') {
                promise = bond.api.toggleState(device, 'down_light');
            }
            else {
                promise = bond.api.toggleState(device, 'light');
            }
            await promise
                .then(() => {
                this.platform.debug(this.accessory, 'Light state toggled');
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error toggling light state: ${error}`);
            });
        }, { resetToFalse: true });
    }
    observeLightDimmer(bond, device, service) {
        if (!service) {
            return;
        }
        Observer_1.Observer.set(service.on, async (value) => {
            let promise;
            if (value === true) {
                const subtype = service.subType;
                if (subtype === 'UpLight') {
                    promise = bond.api.startUpLightDimmer(device);
                }
                else if (subtype === 'DownLight') {
                    promise = bond.api.startDownLightDimmer(device);
                }
                else {
                    promise = bond.api.startDimmer(device);
                }
            }
            else {
                promise = bond.api.stop(device);
            }
            await promise
                .then(() => {
                this.platform.debug(this.accessory, `Toggled dimmer: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error toggling dimmer: ${error}`);
            });
        });
    }
    observeLightIncreaseBrightness(bond, device, downService) {
        if (!this.increaseBrightnessService) {
            return;
        }
        Observer_1.Observer.set(this.increaseBrightnessService.on, async (value) => {
            let promise;
            if (value === true) {
                if (downService) {
                    bond.api.stop(device);
                    downService.on.updateValue(false);
                }
                promise = bond.api.startIncreasingBrightness(device);
            }
            else {
                promise = bond.api.stop(device);
            }
            await promise
                .then(() => {
                this.platform.debug(this.accessory, `Increased Brightness: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error increasing brightness: ${error}`);
            });
        });
    }
    observeLightDecreaseBrightness(bond, device, upService) {
        if (!this.decreaseBrightnessService) {
            return;
        }
        Observer_1.Observer.set(this.decreaseBrightnessService.on, async (value) => {
            let promise;
            if (value === true) {
                if (upService) {
                    bond.api.stop(device);
                    upService.on.updateValue(false);
                }
                promise = bond.api.startDecreasingBrightness(device);
            }
            else {
                promise = bond.api.stop(device);
            }
            await promise
                .then(() => {
                this.platform.debug(this.accessory, `Decreased Brightness: ${value}`);
            })
                .catch((error) => {
                this.platform.error(this.accessory, `Error decreasing brightness: ${error}`);
            });
        });
    }
    removeService(serviceName) {
        const service = this.accessory.getService(serviceName);
        if (service) {
            this.accessory.removeService(service);
            this.platform.log(`Removing Service ${serviceName}`);
        }
    }
}
exports.CeilingFanAccessory = CeilingFanAccessory;
