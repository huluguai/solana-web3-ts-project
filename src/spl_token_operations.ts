import * as fs from 'fs';
import { Connection, Keypair, SYSVAR_RECENT_BLOCKHASHES_PUBKEY } from '@solana/web3.js';
import { RPC_ENDPOINT,PAYER_KEYPAIR } from './config';
import { error } from 'console';
/**
 * 加载密钥对
 */
function loadKeypair(path: string): Keypair {
   const secreKeyString = fs.readFileSync(path, 'utf8');
   const secretKey = Uint8Array.from(JSON.parse(secreKeyString));
   return Keypair.fromSecretKey(secretKey);
}

/** 主函数 */
async function main() {
    console.log('\n=== SPL TOKEN 发行与转账演示 ===\n');
    //1 建立连接
    const connection = new Connection(RPC_ENDPOINT,"confirmed");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    console.log("连接到 Solana:",RPC_ENDPOINT);
    //2加载支付者密钥对
    const payer = loadKeypair(PAYER_KEYPAIR);
    console.log("支付者地址:",payer.publicKey.toBase58);
}

main()
    .then(() => {
        console.log("\n 程序执行成功");
        process.exit(0)
    })
    .catch((error) => {
        console.error("\n 发生错误:",error);
        process.exit(1);
    })