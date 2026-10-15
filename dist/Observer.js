"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Observer = void 0;
class Observer {
    static set(characteristic, set, options = {}) {
        characteristic
            .onSet(async (value) => {
            // Avoid doing anything when the device is in the requested state
            if (value === characteristic.value) {
                return;
            }
            if (options.resetToFalse && value !== true) {
                return;
            }
            await set(value);
            if (options.resetToFalse) {
                setTimeout(() => {
                    characteristic.updateValue(false);
                }, 500);
            }
        });
    }
}
exports.Observer = Observer;
