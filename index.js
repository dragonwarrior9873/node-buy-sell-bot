const dotenv = require("dotenv");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { ACTON_BUY } = require("./constant");
const {
  Connection,
  VersionedTransaction,
  clusterApiUrl,
} = require("@solana/web3.js");
const { getMint } = require("@solana/spl-token");
const bs58 = require("bs58");
const BN = require("bn.js");
const {
  sendBundleWithAddress,
  buildBuyTransaction,
  buildSellTransaction,
  getTipTransaction,
  getPoolInfo,
  sendBundleConfirmTxId,
} = require("./util");
const {
  openDatabase,
  queryPool,
  insertPool,
  updateWallet,
  updateToken,
  updateSlippage,
  getSettingInfo,
} = require("./database");

dotenv.config();
const NET_URL =
  process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(NET_URL, "confirmed");

let wallet;
const JITO_TIP = process.env.JITO_TIP || 0.001;

let db;

async function startBuy(_token, amount) {
  let verTxns = [];

  const rows = await queryPool(db, _token);
  let poolInfo;
  if (rows) {
    poolInfo = JSON.parse(rows.pool_info);
  } else {
    poolInfo = await getPoolInfo(connection, _token);
    await insertPool(db, _token, JSON.stringify(poolInfo));
  }

  const mint = new PublicKey(_token);
  const token = await getMint(connection, mint);

  const txns = await buildBuyTransaction(
    connection,
    wallet,
    token,
    poolInfo,
    amount
  );
  for (let tx of txns) {
    if (tx instanceof VersionedTransaction) {
      tx.sign([wallet]);
      verTxns.push(tx);
    }
  }

  const tipTxn = await getTipTransaction(
    connection,
    wallet.publicKey,
    JITO_TIP
  );
  tipTxn.sign([wallet]);
  verTxns.push(tipTxn);

  const txHash = bs58.encode(tipTxn.signatures[0]);

  console.log("txHash :>> ", txHash);
  sendBundleConfirmTxId([verTxns], [txHash], connection);
}

async function startSell(_token, percent) {
  let verTxns = [];

  const rows = await queryPool(db, _token);
  let poolInfo;
  if (rows) {
    poolInfo = JSON.parse(rows.pool_info);
  } else {
    poolInfo = await getPoolInfo(connection, _token);
    await insertPool(db, _token, JSON.stringify(poolInfo));
  }

  const mint = new PublicKey(_token);
  const token = await getMint(connection, mint);

  const txns = await buildSellTransaction(
    connection,
    wallet,
    token,
    poolInfo,
    percent
  );
  for (let tx of txns) {
    if (tx instanceof VersionedTransaction) {
      tx.sign([wallet]);
      verTxns.push(tx);
    }
  }

  const tipTxn = await getTipTransaction(
    connection,
    wallet.publicKey,
    JITO_TIP
  );
  tipTxn.sign([wallet]);
  verTxns.push(tipTxn);

  const txHash = bs58.encode(tipTxn.signatures[0]);

  console.log("txHash :>> ", txHash);
  sendBundleConfirmTxId([verTxns], [txHash], connection);
}

function printHelp() {
  console.log(
    `wallet\t\t\tUser's Private Key
token\t\t\tToken address User wants to buy and sell. Ex:) token AKWawM6ZeGNnLtkemxju6DnwKzS3hFyQParUww6ErkK5
slippage\t\tSlippage used when buying and selling. Ex:) slippage 20 => 20% slippage
buy\t\t\tSpecify the sol amount the user wants to buy token with. Ex:) buy 1 => buy 1 sol
sell\t\t\tSpecify the percent of token user has in wallet. Ex:) sell 50 => sell 50%`
  );
}

// script.js
async function main(args) {
  db = await openDatabase();

  if (args.length < 1) {
    printHelp();
  }

  const argCmd = args[0];
  const argVal = args[1];

  switch (argCmd) {
    case `wallet`:
      if (argVal) {
        try {
          await updateWallet(db, argVal);
          console.log("Set wallet :>> ", argVal);
        } catch (error) {
          console.log("error :>> ", error);
        }
      } else {
        printHelp();
        return;
      }
      break;
    case `token`:
      if (argVal) {
        try {
          await updateToken(db, argVal);

          const rows = await queryPool(db, argVal);
          if (!rows) {
            poolInfo = await getPoolInfo(connection, argVal);
            console.log("poolInfo :>> ", poolInfo);
            await insertPool(db, argVal, JSON.stringify(poolInfo));
          }

          console.log("Set token :>> ", argVal);
        } catch (error) {
          console.log("error :>> ", error);
        }
      } else {
        printHelp();
        return;
      }
      break;
    case `slippage`:
      if (argVal) {
        try {
          await updateSlippage(db, argVal);
          console.log("Set slippage :>> ", argVal);
        } catch (error) {
          console.log("error :>> ", error);
        }
      } else {
        printHelp();
        return;
      }
      break;
    case `buy`:
      if (argVal) {
        try {
          const result = await getSettingInfo(db);
          console.log("result :>> ", result);
          if (result.wallet && result.token) {
            wallet = Keypair.fromSecretKey(bs58.decode(result.wallet));
            startBuy(result.token, argVal, result.slippage);
            console.log("success to buy");
          } else {
            console.log("please check wallet and token.");
          }
        } catch (error) {
          console.log("error :>> ", error);
        }
      } else {
        printHelp();
        return;
      }
      break;
    case `sell`:
      if (argVal) {
        try {
          const result = await getSettingInfo(db);
          console.log("result :>> ", result);
          if (result.wallet && result.token) {
            wallet = Keypair.fromSecretKey(bs58.decode(result.wallet));
            startSell(result.token, argVal, result.slippage);
            console.log("success to sell");
          } else {
            console.log("please check wallet and token.");
          }
        } catch (error) {
          console.log("error :>> ", error);
        }
      } else {
        printHelp();
        return;
      }
      break;
    default:
      printHelp();
      return;
  }
}

const args = process.argv.slice(2); // Extract the command-line arguments
main(args);

// privatekey action token_address amount slippage
//sample buy command 0 - buy 1- sell
//node index.js 0 AKWawM6ZeGNnLtkemxju6DnwKzS3hFyQParUww6ErkK5 0.0005 90
//sample sell command
// node index.js 1 AKWawM6ZeGNnLtkemxju6DnwKzS3hFyQParUww6ErkK5 0.0005 90
