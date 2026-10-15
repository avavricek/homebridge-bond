"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Device = void 0;
const Action_1 = require("../enum/Action");
const DeviceType_1 = require("../enum/DeviceType");
// eslint-disable-next-line @typescript-eslint/no-namespace
var Device;
(function (Device) {
    function displayName(device) {
        return device.location ? `${device.location} ${device.name}` : device.name;
    }
    Device.displayName = displayName;
    function isSupported(device) {
        const supported = [DeviceType_1.DeviceType.CeilingFan, DeviceType_1.DeviceType.Generic, DeviceType_1.DeviceType.Fireplace, DeviceType_1.DeviceType.Shades, DeviceType_1.DeviceType.Light];
        return supported.includes(device.type);
    }
    Device.isSupported = isSupported;
    function HasDimmer(device) {
        const dimmer = [Action_1.Action.StartDimmer];
        return device.actions.some(r => dimmer.includes(r));
    }
    Device.HasDimmer = HasDimmer;
    function HasSeparateDimmers(device) {
        const required = [Action_1.Action.StartIncreasingBrightness, Action_1.Action.StartDecreasingBrightness];
        return required.every(r => device.actions.includes(r));
    }
    Device.HasSeparateDimmers = HasSeparateDimmers;
    function CFhasLightbulb(device) {
        const lightbulb = [Action_1.Action.ToggleLight];
        return device.actions.some(r => lightbulb.includes(r));
    }
    Device.CFhasLightbulb = CFhasLightbulb;
    function CFhasUpDownLight(device) {
        const required = [Action_1.Action.ToggleUpLight, Action_1.Action.ToggleDownLight];
        return required.every(r => device.actions.includes(r));
    }
    Device.CFhasUpDownLight = CFhasUpDownLight;
    function canSetSpeed(device) {
        const required = [Action_1.Action.SetSpeed];
        const hasSetSpeed = required.every(r => device.actions.includes(r));
        const hasMaxSpeed = device.properties.max_speed !== undefined;
        return hasSetSpeed && hasMaxSpeed;
    }
    Device.canSetSpeed = canSetSpeed;
    function canIncreaseDecreaseSpeed(device) {
        const required = [Action_1.Action.IncreaseSpeed, Action_1.Action.DecreaseSpeed];
        return required.every(r => device.actions.includes(r));
    }
    Device.canIncreaseDecreaseSpeed = canIncreaseDecreaseSpeed;
    function hasOffOn(device) {
        const required = [Action_1.Action.TurnOff, Action_1.Action.TurnOn];
        return required.every(r => device.actions.includes(r));
    }
    Device.hasOffOn = hasOffOn;
    function hasReverseSwitch(device) {
        const required = [Action_1.Action.ToggleDirection];
        return required.every(r => device.actions.includes(r));
    }
    Device.hasReverseSwitch = hasReverseSwitch;
    function GXhasToggle(device) {
        const fan = [Action_1.Action.TogglePower];
        return device.actions.some(r => fan.includes(r));
    }
    Device.GXhasToggle = GXhasToggle;
    function FPhasToggle(device) {
        const fan = [Action_1.Action.TogglePower];
        return device.actions.some(r => fan.includes(r));
    }
    Device.FPhasToggle = FPhasToggle;
    function FPhasFlame(device) {
        const required = [Action_1.Action.SetFlame, Action_1.Action.TogglePower];
        return required.every(r => device.actions.includes(r));
    }
    Device.FPhasFlame = FPhasFlame;
    function MShasToggle(device) {
        const fan = [Action_1.Action.ToggleOpen];
        return device.actions.some(r => fan.includes(r));
    }
    Device.MShasToggle = MShasToggle;
    function MShasPreset(device) {
        const required = [Action_1.Action.Preset];
        return required.every(r => device.actions.includes(r));
    }
    Device.MShasPreset = MShasPreset;
    function LThasLightbulb(device) {
        const lightbulb = [Action_1.Action.ToggleLight];
        return device.actions.some(r => lightbulb.includes(r));
    }
    Device.LThasLightbulb = LThasLightbulb;
    function LThasBrightness(device) {
        const required = [Action_1.Action.SetBrightness, Action_1.Action.TurnLightOff];
        return required.every(r => device.actions.includes(r));
    }
    Device.LThasBrightness = LThasBrightness;
    function fanSpeeds(device) {
        if (device.commands) {
            const values = device.commands
                .filter(cmd => {
                // Find all of the commands associated with speed
                return cmd.action === Action_1.Action.SetSpeed;
            })
                .sort((a, b) => a.argument - b.argument)
                .map(cmd => {
                // map down to the raw argument values from that command
                return cmd.argument || 0;
            });
            return values.sort((a, b) => a - b);
        }
        else if (device.properties.max_speed === undefined || device.properties.max_speed === null) {
            return [];
        }
        else {
            // Assume speeds 1 - max_speed
            const max_speed = device.properties.max_speed;
            const vals = Array(max_speed)
                .fill(1)
                .map((x, y) => x + y);
            return vals.sort((a, b) => a - b);
        }
    }
    Device.fanSpeeds = fanSpeeds;
    function MShasPosition(device) {
        const required = [Action_1.Action.SetPosition];
        return required.every(r => device.actions.includes(r));
    }
    Device.MShasPosition = MShasPosition;
    function MSisAwning(device) {
        return device.subtype === 'AWNING';
    }
    Device.MSisAwning = MSisAwning;
})(Device || (exports.Device = Device = {}));
