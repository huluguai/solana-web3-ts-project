import * as fs from 'fs';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';
import { RPC_ENDPOINT,PAYER_KEYPAIR } from './config';
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
    //3 检查余额
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`支付者 ${payer.publicKey.toBase58()} 的余额: ${balance / LAMPORTS_PER_SOL} SOL`);
    if(balance < 0.01 * LAMPORTS_PER_SOL){
        console.error("余额不足,请先充值 SOL");
        // Airdrop 一些 SOL
        const airdropSignature = await connection.requestAirdrop(payer.publicKey, 10 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction({
            blockhash,
            lastValidBlockHeight,
            signature: airdropSignature
        });
        console.log("Airdrop 10 SOL 成功");
    }
    //4 创建新的 Token Mint
    console.log("正在创建新的 Token Mint");
    const mint = await createMint(
        connection,
        payer,//支付交易费用的账户
        payer.publicKey,//mint authority (铸币权限)
        payer.publicKey,//freeze authority (冻结权限)
        9
    );
    console.log("新的 Token Mint 创建成功:", mint.toBase58());
    //5 为支付者创建 token account
    console.log("正在为支付者创建新的 Token Account");
    const payTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
    );
    console.log("支付者 Token Account 创建成功:", payTokenAccount.address.toBase58());
    console.log("支付者 Token Account 余额:", payTokenAccount.amount);
    // 铸造token （发行）
    const mintTokenAmount = 1000 * 1e9; //1000 个 token (考虑9位小数)
    console.log(`正在铸造 ${mintTokenAmount / 1e9} 个 token`);
    const mintSignature = await mintTo(
        connection,
        payer,
        mint,
        payTokenAccount.address,
        payer.publicKey,
        mintTokenAmount
    );
    console.log("铸造 token 成功:交易签名:", mintSignature);
    // 查询余额
    const updatedAmount = await connection.getTokenAccountBalance(payTokenAccount.address);
    console.log(`新余额 ${Number(updatedAmount.value.amount) / 1e9} 个 token`);
    // 创建接收者账户并转账
    console.log("正在创建接收者账户并转账");
    const receiver = Keypair.generate();
    console.log("接收者账户:", receiver.publicKey.toBase58());
    console.log("为接收者空投sol 以支付租金");
    const airdropSignature = await connection.requestAirdrop(receiver.publicKey, 0.1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature: airdropSignature
    });
    console.log("为接收者空投sol 成功");
    console.log("正在为接收者创建 token account");
    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        receiver,
        mint,
        receiver.publicKey,
    );
    console.log("接收者 Token Account 创建成功:", receiverTokenAccount.address.toBase58());
    console.log(`   当前余额: ${receiverTokenAccount.amount}\n`);
    // 转账
    console.log("正在转账");
    const transferAmount = 100 * 1e9; //100 个 token
    console.log(`正在转账 ${transferAmount / 1e9} 个 token 给接收者`);


    const transferSignature = await transfer(
        connection,
        payer,
        payTokenAccount.address,
        receiverTokenAccount.address,
        payer.publicKey,
        transferAmount
    );
    console.log("转账成功:交易签名:", transferSignature);
    // 查询最终余额
    const finalPayerBalance = await connection.getTokenAccountBalance(payTokenAccount.address);
    console.log(`支付者最终余额: ${Number(finalPayerBalance.value.amount) / 1e9} 个 token`);
    const finalReceiverBalance = await connection.getTokenAccountBalance(receiverTokenAccount.address);
    console.log(`接收者最终余额: ${Number(finalReceiverBalance.value.amount) / 1e9} 个 token`);
    // 打印交易详情
    console.log("\n=== 交易详情 ===\n");
    console.log(`支付者: ${payer.publicKey.toBase58()}`);
    console.log(`接收者: ${receiver.publicKey.toBase58()}`);
    console.log(`转账金额: ${transferAmount / 1e9} 个 token`);
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