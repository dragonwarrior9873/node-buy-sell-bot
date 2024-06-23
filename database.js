const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

sqlite3.verbose();

async function openDatabase() {
  const newdb = await open({
    filename: "pool.db",
    driver: sqlite3.Database,
  });

  try {
    await newdb.get(`select * from pool`);
  } catch (error) {
    console.log("error :>> ", error);
    await createTables(newdb);
  }

  return newdb;
}

async function createTables(newdb) {
  await newdb.exec(`
    create table pool (
        token text primary key not null,
        pool_info text not null
    );
    create table setting (
        wallet text not null,
        token text not null,
        slippage number not null
    );
    insert into setting (wallet, token, slippage) values ('', '', 20);
        `);
}

async function queryPool(db, token) {
  const result = await db.get(
    `select pool_info from pool where token = ?`,
    token
  );
  return result;
}

async function insertPool(db, token, pool_info) {
  await db.exec(
    `insert into pool (token, pool_info) values ('${token}', '${pool_info}')`
  );
}

async function updateWallet(db, privatekey) {
  await db.exec(`UPDATE setting SET wallet = '${privatekey}'`);
}

async function updateToken(db, token) {
  await db.exec(`UPDATE setting SET token = '${token}'`);
}

async function updateSlippage(db, slippage) {
  await db.exec(`UPDATE setting SET slippage = '${slippage}'`);
}

async function getSettingInfo(db) {
  const result = await db.get(`select * from setting`)
  return result
}

module.exports = {
  openDatabase,
  queryPool,
  insertPool,
  updateWallet,
  updateToken,
  updateSlippage,
  getSettingInfo
};
