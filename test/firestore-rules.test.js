const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { after, before, beforeEach, test } = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require("@firebase/rules-unit-testing");
const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} = require("firebase/firestore");

let testEnv;

before(async () => {
  const rules = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: "demo-smvastro-rules",
    firestore: { rules }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "smv_users", "customer-a"), { role: "customer" });
    await setDoc(doc(firestore, "smv_users", "customer-b"), { role: "customer" });
    // Simulate an old/escalated profile created while the previously published
    // rule allowed any role on first profile creation. This alone must not grant
    // Admin authorization after the rules update.
    await setDoc(doc(firestore, "smv_users", "fake-admin"), { role: "admin" });
    await setDoc(doc(firestore, "smv_users", "staff-admin"), { role: "admin" });
    await setDoc(doc(firestore, "smv_admins", "staff-admin"), {
      grantedBy: "TwjeEIFS3Zcf1SxboLZoujm91Ky2"
    });

    await setDoc(doc(firestore, "smv_wallets", "customer-a"), {
      ownerUid: "customer-a",
      balancePaise: 2500
    });
    await setDoc(doc(firestore, "smv_wallets", "customer-b"), {
      ownerUid: "customer-b",
      balancePaise: 1000
    });
    await setDoc(doc(firestore, "smv_wallet_transactions", "tx-a"), {
      ownerUid: "customer-a",
      amountPaise: 1000,
      createdAt: new Date("2026-01-01T00:00:00Z")
    });
    await setDoc(doc(firestore, "smv_wallet_transactions", "tx-b"), {
      ownerUid: "customer-b",
      amountPaise: 500,
      createdAt: new Date("2026-01-02T00:00:00Z")
    });
    await setDoc(doc(firestore, "smv_wallet_recharges", "recharge-a"), {
      customerUid: "customer-a",
      amountPaise: 5000,
      status: "captured"
    });
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test("a signed-in customer can read their own Wallet, but not another customer's Wallet", async () => {
  const customer = testEnv.authenticatedContext("customer-a").firestore();
  const other = testEnv.unauthenticatedContext().firestore();

  await assertSucceeds(getDoc(doc(customer, "smv_wallets", "customer-a")));
  await assertFails(getDoc(doc(customer, "smv_wallets", "customer-b")));
  await assertFails(getDoc(doc(other, "smv_wallets", "customer-a")));
});

test("Wallet balances are server-owned: clients cannot create, update, or delete them", async () => {
  const customer = testEnv.authenticatedContext("customer-a").firestore();
  const admin = testEnv.authenticatedContext("staff-admin").firestore();

  await assertFails(setDoc(doc(customer, "smv_wallets", "customer-c"), { balancePaise: 999999 }));
  await assertFails(updateDoc(doc(customer, "smv_wallets", "customer-a"), { balancePaise: 999999 }));
  await assertFails(deleteDoc(doc(customer, "smv_wallets", "customer-a")));
  // Admin dashboards must use the authenticated backend/Admin SDK, not client-side writes.
  await assertFails(updateDoc(doc(admin, "smv_wallets", "customer-a"), { balancePaise: 999999 }));
});

test("transaction ledger reads are owner-scoped and queries must prove the owner", async () => {
  const customer = testEnv.authenticatedContext("customer-a").firestore();

  await assertSucceeds(getDoc(doc(customer, "smv_wallet_transactions", "tx-a")));
  await assertFails(getDoc(doc(customer, "smv_wallet_transactions", "tx-b")));
  await assertSucceeds(getDocs(query(
    collection(customer, "smv_wallet_transactions"),
    where("ownerUid", "==", "customer-a")
  )));
  await assertFails(getDocs(collection(customer, "smv_wallet_transactions")));
});

test("recharge details are owner-scoped and never client-writable", async () => {
  const customerA = testEnv.authenticatedContext("customer-a").firestore();
  const customerB = testEnv.authenticatedContext("customer-b").firestore();

  await assertSucceeds(getDoc(doc(customerA, "smv_wallet_recharges", "recharge-a")));
  await assertFails(getDoc(doc(customerB, "smv_wallet_recharges", "recharge-a")));
  await assertFails(setDoc(doc(customerA, "smv_wallet_recharges", "forged"), {
    customerUid: "customer-a", amountPaise: 999999, status: "captured"
  }));
  await assertFails(updateDoc(doc(customerA, "smv_wallet_recharges", "recharge-a"), {
    amountPaise: 999999
  }));
  await assertFails(deleteDoc(doc(customerA, "smv_wallet_recharges", "recharge-a")));
});

test("a user cannot self-create an Admin role or later change their own role", async () => {
  const newUser = testEnv.authenticatedContext("self-admin").firestore();
  const selfCustomer = testEnv.authenticatedContext("self-customer").firestore();
  const customer = testEnv.authenticatedContext("customer-a").firestore();

  await assertFails(setDoc(doc(newUser, "smv_users", "self-admin"), { role: "admin" }));
  await assertSucceeds(setDoc(doc(selfCustomer, "smv_users", "self-customer"), { role: "customer" }));
  await assertFails(updateDoc(doc(customer, "smv_users", "customer-a"), { role: "admin" }));
});

test("a legacy profile with role=admin alone is not trusted as an Admin allowlist entry", async () => {
  const fakeAdmin = testEnv.authenticatedContext("fake-admin").firestore();

  await assertFails(getDoc(doc(fakeAdmin, "smv_wallets", "customer-a")));
  await assertFails(getDoc(doc(fakeAdmin, "smv_settings", "commission")));
});

test("server-managed Admin allowlist and trusted Firebase claims may authorize Admin reads", async () => {
  const allowlistedAdmin = testEnv.authenticatedContext("staff-admin").firestore();
  const claimsAdmin = testEnv.authenticatedContext("claims-admin", { role: "admin" }).firestore();
  const fixedOwner = testEnv.authenticatedContext("TwjeEIFS3Zcf1SxboLZoujm91Ky2").firestore();

  await assertSucceeds(getDoc(doc(allowlistedAdmin, "smv_wallets", "customer-a")));
  await assertSucceeds(getDoc(doc(claimsAdmin, "smv_wallets", "customer-a")));
  await assertSucceeds(getDoc(doc(fixedOwner, "smv_wallets", "customer-a")));
});

test("regular users cannot grant themselves an smv_admins allowlist document", async () => {
  const customer = testEnv.authenticatedContext("customer-a").firestore();

  await assertFails(setDoc(doc(customer, "smv_admins", "customer-a"), { role: "admin" }));
});
