"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BondUri = void 0;
class BondUri {
    constructor(bondIP) {
        this.bondIP = bondIP;
    }
    version() {
        return `http://${this.bondIP}/v2/sys/version`;
    }
    deviceIds() {
        return `http://${this.bondIP}/v2/devices`;
    }
    device(id) {
        return `http://${this.bondIP}/v2/devices/${id}`;
    }
    state(id) {
        return `http://${this.bondIP}/v2/devices/${id}/state`;
    }
    action(id, action) {
        return `http://${this.bondIP}/v2/devices/${id}/actions/${action}`;
    }
    commands(id) {
        return `http://${this.bondIP}/v2/devices/${id}/commands`;
    }
    command(deviceId, commandId) {
        return `http://${this.bondIP}/v2/devices/${deviceId}/commands/${commandId}`;
    }
    properties(id) {
        return `http://${this.bondIP}/v2/devices/${id}/properties`;
    }
}
exports.BondUri = BondUri;
