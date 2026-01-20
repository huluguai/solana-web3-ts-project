/** Challenge: Mint an SPL Token
 *
 * In this challenge, you will create an SPL token!
 *
 * Goal:
 *   Mint an SPL token in a single transaction using Web3.js and the SPL Token library.
 *
 * Objectives:
 *   1. Create an SPL mint account.
 *   2. Initialize the mint with 6 decimals and your public key (feePayer) as the mint and freeze authorities.
 *   3. Create an associated token account for your public key (feePayer) to hold the minted tokens.
 *   4. Mint 21,000,000 tokens to your associated token account.
 *   5. Sign and send the transaction.
 */

import {
    Keypair,
    Connection,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
  } from "@solana/web3.js";
  
  import {
    createAssociatedTokenAccountInstruction,
    createInitializeMint2Instruction,
    createMintToInstruction,
    createMintToCheckedInstruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
  
    ASSOCIATED_TOKEN_PROGRAM_ID
  } from "@solana/spl-token";
  
  import bs58 from "bs58";
  
// Import our keypair from the wallet file
const secret = process.env.SECRET;
    if (!secret) {
    throw new Error("SECRET environment variable is not set");
}

const feePayer = Keypair.fromSecretKey(
    // ⚠️ INSECURE KEY. DO NOT USE OUTSIDE OF THIS CHALLENGE
    bs58.decode(secret)
);

//Create a connection to the RPC endpoint
const rpcEndpoint = process.env.RPC_ENDPOINT;
    if (!rpcEndpoint) {
    throw new Error("RPC_ENDPOINT environment variable is not set");
}

const connection = new Connection(
    rpcEndpoint, // RPC端点URL
    "confirmed" // 确认模式
);
  
  // Entry point of your TypeScript code (we will call this)
  async function main() {
    try {
  
      // Generate a new keypair for the mint account
      const mint = Keypair.generate();

      // getMinimumBalanceForRentExemptMint()函数的作用就是计算对于一个新创建的代币 Mint 账户，需要存入多少 SOL 才能达到这个租金豁免门槛
      const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
      // START HERE
        
      // Create the mint account 
      //在区块链上创建了一个空白的、符合SPL代币标准的账户容器。此时它还没有任何代币属性
      const createAccountIx = SystemProgram.createAccount({
        fromPubkey: feePayer.publicKey, // 支付账户创建费用的地址
        newAccountPubkey: mint.publicKey, // 新Mint账户的地址。通常由一个新生成的密钥对提供，代表您代币的唯一标识
        space: MINT_SIZE, // Mint账户所需存储空间
        lamports: mintRent, // 存入新账户的SOL数量，用于支付“租金”，使其获得租金豁免资格，避免被网络清除
        programId: TOKEN_PROGRAM_ID  // 新账户的所有者程序。设为 TOKEN_PROGRAM_ID，意味着这个账户将遵守SPL代币标准规则
      });
  
  
      // Initialize the mint account
      // Set decimals to 6, and the mint and freeze authorities to the fee payer (you).
       const initializeMintIx = createInitializeMint2Instruction(
        mint.publicKey, // 要初始化的Mint地址
        6,  // 小数位数：6（与以太坊的18位不同）
        feePayer.publicKey,  // Mint权限：可增发代币的地址
        feePayer.publicKey, // 冻结权限：可冻结代币账户的地址
        TOKEN_PROGRAM_ID // SPL Token程序ID
       );
  
    // 3. 获取或计算关联代币账户(ATA)地址
    //确定性计算：给定相同的输入（尤其是mint.publicKey和feePayer.publicKey），无论计算多少次，在任何地方计算，输出的ATA地址都是唯一且确定的。这意味着即使这个ATA账户还没有在链上被创建，您也可以预先知道它的地址。
    //程序派生地址：计算出的ATA地址是一种程序派生地址，它本身没有私钥，由关联代币账户程序（ASSOCIATED_TOKEN_PROGRAM_ID）进行管理
    const associatedTokenAccount = getAssociatedTokenAddressSync(
        mint.publicKey,                         // 代币Mint地址
        feePayer.publicKey,                     // 代币账户所有者
        false,                                  // 是否允许所有者代理（通常为false）
        TOKEN_PROGRAM_ID,                       // SPL Token程序ID
        ASSOCIATED_TOKEN_PROGRAM_ID             // 关联代币账户程序ID
      );
      // Create the associated token account
      // const associatedTokenAccount = ??? 创建关联代币账户指令（ATA）
      const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
        feePayer.publicKey,                     // 支付账户创建费用的地址
        associatedTokenAccount,                 // 新ATA地址
        feePayer.publicKey,                     // ATA所有者地址
        mint.publicKey,                         // 代币Mint地址
        TOKEN_PROGRAM_ID,                       // SPL Token程序ID
        ASSOCIATED_TOKEN_PROGRAM_ID             // 关联代币账户程序ID
      );
  
  
      // Mint 21,000,000 tokens to the associated token account
      const mintAmount = 21000000 * 1e6; // 21,000,000 tokens (6 decimals)
      const mintToCheckedIx = createMintToCheckedInstruction(
        mint.publicKey,                         // 代币Mint地址
        associatedTokenAccount,                 // 代币账户地址
        feePayer.publicKey,                     // 支付账户地址
        mintAmount,                              // 要铸造的代币数量
        6,                                      // 小数位数
        [],                                     // 多签名权限（空数组表示单签名）
        TOKEN_PROGRAM_ID                        // SPL Token程序ID
      );
  
  
      const recentBlockhash = await connection.getLatestBlockhash();

      // 核心优势：原子性执行
      // 创建一个新交易，指定支付费用的账户、区块哈希和有效高度
      const transaction = new Transaction({
        feePayer: feePayer.publicKey, // 支付费用的账户地址
        blockhash: recentBlockhash.blockhash, // 当前区块的哈希值，用于验证交易的有效性
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight // 当前区块的高度，用于验证交易的有效性
      }).add(
          createAccountIx, // 创建Mint账户指令
          initializeMintIx, // 初始化Mint账户指令
          createAssociatedTokenAccountIx, // 创建关联代币账户指令
          mintToCheckedIx, // 铸造代币指令
      );
      // 发送并确认交易，指定支付费用的账户、区块哈希和有效高度
      const transactionSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [feePayer, mint]  // 签名者列表。谁应该签署这个交易？
      );
  
      console.log("Mint Address:", mint.publicKey.toBase58());
      console.log("Transaction Signature:", transactionSignature);
    } catch (error) {
      console.error(`Oops, something went wrong: ${error}`);
    }
  }
  