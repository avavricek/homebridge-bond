"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = void 0;
var Action;
(function (Action) {
    // Power (all device types)
    Action["TurnOn"] = "TurnOn";
    Action["TurnOff"] = "TurnOff";
    Action["TogglePower"] = "TogglePower";
    // Speed (CF)
    Action["SetSpeed"] = "SetSpeed";
    Action["IncreaseSpeed"] = "IncreaseSpeed";
    Action["DecreaseSpeed"] = "DecreaseSpeed";
    // Breeze (CF)
    Action["BreezeOn"] = "BreezeOn";
    Action["BreezeOff"] = "BreezeOff";
    Action["SetBreeze"] = "SetBreeze";
    // Direction (CF)
    Action["SetDirection"] = "SetDirection";
    Action["ToggleDirection"] = "ToggleDirection";
    // Light (CF, LT)
    Action["TurnLightOn"] = "TurnLightOn";
    Action["TurnLightOff"] = "TurnLightOff";
    Action["ToggleLight"] = "ToggleLight";
    // UpDownLight (CF)
    Action["TurnUpLightOn"] = "TurnUpLightOn";
    Action["TurnUpLightOff"] = "TurnUpLightOff";
    Action["TurnDownLightOn"] = "TurnDownLightOn";
    Action["TurnDownLightOff"] = "TurnDownLightOff";
    Action["ToggleUpLight"] = "ToggleUpLight";
    Action["ToggleDownLight"] = "ToggleDownLight";
    // Brightness (CF, LT)
    Action["SetBrightness"] = "SetBrightness";
    Action["IncreaseBrightness"] = "IncreaseBrightness";
    Action["DecreaseBrightness"] = "DecreaseBrightness";
    Action["StartDimmer"] = "StartDimmer";
    Action["StartUpLightDimmer"] = "StartUpLightDimmer";
    Action["StartDownLightDimmer"] = "StartDownLightDimmer";
    Action["StartIncreasingBrightness"] = "StartIncreasingBrightness";
    Action["StartDecreasingBrightness"] = "StartDecreasingBrightness";
    Action["Stop"] = "Stop";
    // Flame (FP)
    Action["SetFlame"] = "SetFlame";
    Action["IncreaseFlame"] = "IncreaseFlame";
    Action["DecreaseFlame"] = "DecreaseFlame";
    // FpFan (FP)
    Action["TurnFpFanOn"] = "TurnFpFanOn";
    Action["TurnFpFanOff"] = "TurnFpFanOff";
    Action["SetFpFan"] = "SetFpFan";
    // Timer (CF, FP)
    Action["SetTimer"] = "SetTimer";
    // OpenRaiseRetract (MS)
    Action["Open"] = "Open";
    Action["Close"] = "Close";
    Action["ToggleOpen"] = "ToggleOpen";
    Action["Raise"] = "Raise";
    Action["Lower"] = "Lower";
    // Position (MS)
    Action["SetPosition"] = "SetPosition";
    // Hold / Preset (MS)
    Action["Hold"] = "Hold";
    Action["Preset"] = "Preset";
})(Action || (exports.Action = Action = {}));
