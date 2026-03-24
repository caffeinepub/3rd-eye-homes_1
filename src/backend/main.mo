import Map "mo:core/Map";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  // Keep authorization and storage state for upgrade compatibility.
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Legacy user-profile map kept for upgrade compatibility.
  type UserProfile = { flatId : ?Nat; name : Text; mobile : Text };
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Legacy notice types kept for upgrade compatibility.
  type Notice = {
    id : Nat;
    title : Text;
    description : Text;
    postedDate : Text;
    attachment : ?Storage.ExternalBlob;
    attachmentName : ?Text;
    category : Text;
    createdBy : Text;
  };
  let notices = Map.empty<Nat, Notice>();
  var noticeId : Nat = 0;

  // ── Core data types ───────────────────────────────────────────────────────

  // STABLE TYPES — must not change field names/types to preserve upgrade compatibility.

  type FlatOwner = {
    id : Nat;
    block : Text;
    flatNumber : Text;
    ownerName : Text;
    maintenanceAmount : Nat;
    ownerMobile : Text;
    password : Text;
    flatStatus : Text;
  };

  type Payment = {
    id : Nat;
    flatId : Nat;
    amount : Nat;
    paymentMode : Text;
    date : Text;
    receiptId : Text;
  };

  type DebitEntry = {
    id : Nat;
    flatId : Nat;
    amount : Nat;
    description : Text;
    date : Text;
  };

  type Expense = {
    id : Nat;
    category : Text;
    description : Text;
    amount : Nat;
    date : Text;
  };

  // SocietyProfile stable type — must not add fields here.
  // New fields are stored in separate stable vars below.
  type SocietyProfile = {
    name : Text;
    licenseNumber : Text;
    voucherCategories : [Text];
  };

  // ── Stable storage ────────────────────────────────────────────────────────

  let flatOwners    = Map.empty<Nat, FlatOwner>();
  let payments      = Map.empty<Nat, Payment>();
  let debitEntries  = Map.empty<Nat, DebitEntry>();
  let expenses      = Map.empty<Nat, Expense>();

  // Separate stable maps for fields added after initial deployment.
  // Storing them separately avoids stable-type compatibility errors.
  let openingBalances = Map.empty<Nat, Nat>(); // flatId -> opening balance

  var societyProfile : ?SocietyProfile = null;
  var societyAddress : Text = ""; // address stored separately for compatibility

  var flatOwnerId   : Nat = 0;
  var paymentId     : Nat = 0;
  var debitEntryId  : Nat = 0;
  var expenseId     : Nat = 0;

  // ── Flat Owners ───────────────────────────────────────────────────────────

  // Public FlatOwner type exposed through the API includes openingBalance.
  // Internally the stable FlatOwner type does not have this field.
  type FlatOwnerAPI = {
    id : Nat;
    block : Text;
    flatNumber : Text;
    ownerName : Text;
    maintenanceAmount : Nat;
    ownerMobile : Text;
    password : Text;
    flatStatus : Text;
    openingBalance : Nat;
  };

  public func addFlatOwner(flatOwner : FlatOwnerAPI) : async Nat {
    let id = flatOwnerId;
    flatOwners.add(id, {
      id;
      block = flatOwner.block;
      flatNumber = flatOwner.flatNumber;
      ownerName = flatOwner.ownerName;
      maintenanceAmount = flatOwner.maintenanceAmount;
      ownerMobile = flatOwner.ownerMobile;
      password = flatOwner.password;
      flatStatus = flatOwner.flatStatus;
    });
    openingBalances.add(id, flatOwner.openingBalance);
    flatOwnerId += 1;
    id;
  };

  public func updateFlatOwner(flatOwner : FlatOwnerAPI) : async () {
    let id = flatOwner.id;
    flatOwners.add(id, {
      id;
      block = flatOwner.block;
      flatNumber = flatOwner.flatNumber;
      ownerName = flatOwner.ownerName;
      maintenanceAmount = flatOwner.maintenanceAmount;
      ownerMobile = flatOwner.ownerMobile;
      password = flatOwner.password;
      flatStatus = flatOwner.flatStatus;
    });
    openingBalances.add(id, flatOwner.openingBalance);
  };

  public query func getFlatOwner(id : Nat) : async ?FlatOwnerAPI {
    switch (flatOwners.get(id)) {
      case null { null };
      case (?f) {
        let ob = switch (openingBalances.get(id)) { case (?v) v; case null 0 };
        ?{ f with openingBalance = ob };
      };
    };
  };

  public query func getPendingFlats() : async [{
    id              : Nat;
    block           : Text;
    flatNumber      : Text;
    ownerName       : Text;
    maintenanceAmount : Nat;
    ownerMobile     : Text;
    password        : Text;
    flatStatus      : Text;
    openingBalance  : Nat;
    pendingAmount   : Nat;
  }] {
    flatOwners.values().toArray().map(func(flat) {
      let ob = switch (openingBalances.get(flat.id)) { case (?v) v; case null 0 };
      let td = debitEntries.values().toArray()
        .filter(func(d) { d.flatId == flat.id })
        .foldLeft(0, func(acc, e) { acc + e.amount });
      let tc = payments.values().toArray()
        .filter(func(p) { p.flatId == flat.id })
        .foldLeft(0, func(acc, p) { acc + p.amount });
      let totalOwed = ob + td;
      let pendingAmount = if (totalOwed > tc) { totalOwed - tc } else { 0 };
      { flat with openingBalance = ob; pendingAmount };
    });
  };

  // ── Payments ──────────────────────────────────────────────────────────────

  public func addPayment(payment : Payment) : async Nat {
    let id = paymentId;
    payments.add(id, { payment with id });
    paymentId += 1;
    id;
  };

  // ── Debit Entries ─────────────────────────────────────────────────────────

  public func addDebitEntry(debitEntry : DebitEntry) : async Nat {
    let id = debitEntryId;
    debitEntries.add(id, { debitEntry with id });
    debitEntryId += 1;
    id;
  };

  // ── Expenses ──────────────────────────────────────────────────────────────

  public func addExpense(expense : Expense) : async Nat {
    let id = expenseId;
    expenses.add(id, { expense with id });
    expenseId += 1;
    id;
  };

  public query func getAllExpenses() : async [Expense] {
    expenses.values().toArray();
  };

  // ── Society Profile ───────────────────────────────────────────────────────

  // Public SocietyProfile type includes address (stored separately for compatibility).
  type SocietyProfileAPI = {
    name : Text;
    address : Text;
    licenseNumber : Text;
    voucherCategories : [Text];
  };

  public func updateSocietyProfile(profile : SocietyProfileAPI) : async () {
    societyProfile := ?{
      name = profile.name;
      licenseNumber = profile.licenseNumber;
      voucherCategories = profile.voucherCategories;
    };
    societyAddress := profile.address;
  };

  public query func getSocietyProfile() : async ?SocietyProfileAPI {
    switch (societyProfile) {
      case null { null };
      case (?p) {
        ?{
          name = p.name;
          address = societyAddress;
          licenseNumber = p.licenseNumber;
          voucherCategories = p.voucherCategories;
        };
      };
    };
  };

  // ── Statements ────────────────────────────────────────────────────────────

  public query func getFlatStatement(flatId : Nat) : async {
    debits  : [DebitEntry];
    credits : [Payment];
    openingBalance : Nat;
  } {
    let debits  = debitEntries.values().toArray().filter(func(d) { d.flatId == flatId });
    let credits = payments.values().toArray().filter(func(p) { p.flatId == flatId });
    let openingBalance = switch (openingBalances.get(flatId)) { case (?v) v; case null 0 };
    { debits; credits; openingBalance };
  };

  public query func getPendingAmount(flatId : Nat) : async Nat {
    let ob = switch (openingBalances.get(flatId)) { case (?v) v; case null 0 };
    let td = debitEntries.values().toArray()
      .filter(func(d) { d.flatId == flatId })
      .foldLeft(0, func(acc, e) { acc + e.amount });
    let tc = payments.values().toArray()
      .filter(func(p) { p.flatId == flatId })
      .foldLeft(0, func(acc, p) { acc + p.amount });
    let totalOwed = ob + td;
    if (totalOwed > tc) { totalOwed - tc } else { 0 };
  };

  // ── Monthly Debit Generation ──────────────────────────────────────────────

  public func generateMonthlyDebit(description : Text, date : Text) : async () {
    for (flat in flatOwners.values()) {
      debitEntries.add(debitEntryId, {
        id = debitEntryId;
        flatId = flat.id;
        amount = flat.maintenanceAmount;
        description;
        date;
      });
      debitEntryId += 1;
    };
  };

  // ── Dashboard Stats ───────────────────────────────────────────────────────

  public query func getDashboardStats() : async {
    totalFlats     : Nat;
    totalCollected : Nat;
    totalPending   : Nat;
    totalExpenses  : Nat;
  } {
    let totalFlats     = flatOwners.size();
    let totalCollected = payments.values().toArray()
      .foldLeft(0, func(acc, p) { acc + p.amount });
    let totalPending   = flatOwners.values().toArray().foldLeft(0, func(acc, flat) {
      let ob = switch (openingBalances.get(flat.id)) { case (?v) v; case null 0 };
      let d = debitEntries.values().toArray()
        .filter(func(e) { e.flatId == flat.id })
        .foldLeft(0, func(a, e) { a + e.amount });
      let c = payments.values().toArray()
        .filter(func(p) { p.flatId == flat.id })
        .foldLeft(0, func(a, p) { a + p.amount });
      let totalOwed = ob + d;
      acc + (if (totalOwed > c) { totalOwed - c } else { 0 });
    });
    let totalExpenses  = expenses.values().toArray()
      .foldLeft(0, func(acc, e) { acc + e.amount });
    { totalFlats; totalCollected; totalPending; totalExpenses };
  };

};
