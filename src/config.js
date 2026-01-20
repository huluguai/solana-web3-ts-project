"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYER_KEYPAIR = exports.PROGRAM_ID = exports.RPC_ENDPOINT = void 0;
//本地开发使用 HTTP (轮循)
exports.RPC_ENDPOINT = 'http://localhost:8899';
//生产环境使用 WSS （真实监听）
// export const RPC_ENDPOINT = 'wss://mainnet.helius-rpc.com/?api-key=your_api_key';
exports.PROGRAM_ID = "";
exports.PAYER_KEYPAIR = "../keypair.json";
