const dotenv = require("dotenv");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { ACTON_BUY } = require("./constant");
const { Connection, VersionedTransaction, clusterApiUrl } = require("@solana/web3.js");
const { getMint } = require("@solana/spl-token");
const bs58 = require("bs58");
const BN = require("bn.js");
const { sendBundleWithAddress, buildBuyTransaction, buildSellTransaction, getTipTransaction, getPoolInfo } = require("./util")

dotenv.config();
const DEVNET_MODE = process.env.DEVNET_MODE === "true";
const NET_URL = DEVNET_MODE
  ? clusterApiUrl("devnet")
  : process.env.MAINNET_RPC_URL;
const connection = new Connection(NET_URL, "confirmed");
const PRIVATE_KEY = process.env.PRIVATE_KEY
const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
const JITO_TIP = 0.0003

async function startBuySell(action, _token, amount, slippage) {
    let verTxns = []
    let poolInfo = await getPoolInfo(connection, _token);
    const mint = new PublicKey(_token);
    const token = await getMint(connection, mint);
    if (action == ACTON_BUY) {
        const txns = await buildBuyTransaction(connection, keypair, token, poolInfo, amount)
        for (let tx of txns) {
            if (tx instanceof VersionedTransaction) {
              tx.sign([keypair]);
              verTxns.push(tx);
            }
          }
    }
    else {
        const txns = await buildSellTransaction(connection, keypair, token, poolInfo, amount)
        for (let tx of txns) {
            if (tx instanceof VersionedTransaction) {
              tx.sign([keypair]);
              verTxns.push(tx);
            }
          }
    }
    const tipTxn = await getTipTransaction(
        connection,
        keypair.publicKey,
        JITO_TIP
    );
    tipTxn.sign([keypair])
    verTxns.push(tipTxn);
    sendBundleWithAddress([verTxns], [keypair.publicKey], connection)
}

// script.js
async function main(args) {
    if (args.length != 4) {
        console.log("Arguments not correctly provided....")
        return
    }
    startBuySell(args[0], args[1], args[2], args[3])
    console.log('Arguments received:', args);
}

const args = process.argv.slice(2); // Extract the command-line arguments
main(args);

// privatekey action token_address amount slippage
//sample buy command 0 - buy 1- sell
//node index.js 0 AKWawM6ZeGNnLtkemxju6DnwKzS3hFyQParUww6ErkK5 0.0005 90
//sample sell command
// node index.js 1 AKWawM6ZeGNnLtkemxju6DnwKzS3hFyQParUww6ErkK5 0.0005 90