import Map "mo:core/Map";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type UserProfile = { flatId : ?Nat; name : Text; mobile : Text };
  let userProfiles = Map.empty<Principal, UserProfile>();

  type Notice = {
    id : Nat; title : Text; description : Text; postedDate : Text;
    attachment : ?Storage.ExternalBlob; attachmentName : ?Text;
    category : Text; createdBy : Text;
  };
  let notices = Map.empty<Nat, Notice>();
  var noticeId : Nat = 0;

  type FlatOwner = {
    id : Nat; block : Text; flatNumber : Text; ownerName : Text;
    maintenanceAmount : Nat; ownerMobile : Text; password : Text; flatStatus : Text;
  };
  type Payment = {
    id : Nat; flatId : Nat; amount : Nat; paymentMode : Text; date : Text; receiptId : Text;
  };
  type DebitEntry = {
    id : Nat; flatId : Nat; amount : Nat; description : Text; date : Text;
  };
  type Expense = {
    id : Nat; category : Text; description : Text; amount : Nat; date : Text;
  };
  type SocietyProfile = {
    name : Text; licenseNumber : Text; voucherCategories : [Text];
  };

  let flatOwners      = Map.empty<Nat, FlatOwner>();
  let payments        = Map.empty<Nat, Payment>();
  let debitEntries    = Map.empty<Nat, DebitEntry>();
  let expenses        = Map.empty<Nat, Expense>();
  let openingBalances = Map.empty<Nat, Nat>();

  var societyProfile : ?SocietyProfile = null;
  var societyAddress : Text = "";

  var flatOwnerId  : Nat = 0;
  var paymentId    : Nat = 0;
  var debitEntryId : Nat = 0;
  var expenseId    : Nat = 0;

  type FlatOwnerAPI = {
    id : Nat; block : Text; flatNumber : Text; ownerName : Text;
    maintenanceAmount : Nat; ownerMobile : Text; password : Text;
    flatStatus : Text; openingBalance : Nat;
  };

  public func addFlatOwner(flatOwner : FlatOwnerAPI) : async Nat {
    let id = flatOwnerId;
    flatOwners.add(id, {
      id; block = flatOwner.block; flatNumber = flatOwner.flatNumber;
      ownerName = flatOwner.ownerName; maintenanceAmount = flatOwner.maintenanceAmount;
      ownerMobile = flatOwner.ownerMobile; password = flatOwner.password;
      flatStatus = flatOwner.flatStatus;
    });
    openingBalances.add(id, flatOwner.openingBalance);
    flatOwnerId += 1;
    id;
  };

  public func updateFlatOwner(flatOwner : FlatOwnerAPI) : async () {
    let id = flatOwner.id;
    flatOwners.add(id, {
      id; block = flatOwner.block; flatNumber = flatOwner.flatNumber;
      ownerName = flatOwner.ownerName; maintenanceAmount = flatOwner.maintenanceAmount;
      ownerMobile = flatOwner.ownerMobile; password = flatOwner.password;
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
    id : Nat; block : Text; flatNumber : Text; ownerName : Text;
    maintenanceAmount : Nat; ownerMobile : Text; password : Text;
    flatStatus : Text; openingBalance : Nat; pendingAmount : Nat;
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

  public func addPayment(payment : Payment) : async Nat {
    let id = paymentId;
    payments.add(id, { payment with id });
    paymentId += 1;
    id;
  };

  public query func getPayment(id : Nat) : async ?Payment {
    payments.get(id);
  };

  public func addDebitEntry(debitEntry : DebitEntry) : async Nat {
    let id = debitEntryId;
    debitEntries.add(id, { debitEntry with id });
    debitEntryId += 1;
    id;
  };

  public query func getDebitEntry(id : Nat) : async ?DebitEntry {
    debitEntries.get(id);
  };

  public func addExpense(expense : Expense) : async Nat {
    let id = expenseId;
    expenses.add(id, { expense with id });
    expenseId += 1;
    id;
  };

  public query func getExpense(id : Nat) : async ?Expense {
    expenses.get(id);
  };

  public query func getAllExpenses() : async [Expense] {
    expenses.values().toArray();
  };

  // Reset all financial data: payments, debit entries, expenses, opening balances.
  // Flat owner records and society profile are preserved.
  public func resetFinancialData() : async () {
    for (id in payments.keys().toArray().vals()) {
      ignore payments.remove(id);
    };
    for (id in debitEntries.keys().toArray().vals()) {
      ignore debitEntries.remove(id);
    };
    for (id in expenses.keys().toArray().vals()) {
      ignore expenses.remove(id);
    };
    for (id in openingBalances.keys().toArray().vals()) {
      openingBalances.add(id, 0);
    };
    paymentId := 0;
    debitEntryId := 0;
    expenseId := 0;
  };

  type SocietyProfileAPI = {
    name : Text; address : Text; licenseNumber : Text; voucherCategories : [Text];
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
        ?{ name = p.name; address = societyAddress;
           licenseNumber = p.licenseNumber; voucherCategories = p.voucherCategories };
      };
    };
  };

  public query func getFlatStatement(flatId : Nat) : async {
    debits : [DebitEntry]; credits : [Payment]; openingBalance : Nat;
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

  public func generateMonthlyDebit(description : Text, date : Text) : async () {
    for (flat in flatOwners.values()) {
      debitEntries.add(debitEntryId, {
        id = debitEntryId; flatId = flat.id;
        amount = flat.maintenanceAmount; description; date;
      });
      debitEntryId += 1;
    };
  };

  public query func getDashboardStats() : async {
    totalFlats : Nat; totalCollected : Nat; totalPending : Nat; totalExpenses : Nat;
  } {
    let totalFlats     = flatOwners.size();
    let totalCollected = payments.values().toArray().foldLeft(0, func(acc, p) { acc + p.amount });
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
    let totalExpenses = expenses.values().toArray().foldLeft(0, func(acc, e) { acc + e.amount });
    { totalFlats; totalCollected; totalPending; totalExpenses };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  public query func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public func addNotice(notice : Notice) : async Nat {
    let id = noticeId;
    notices.add(id, { notice with id });
    noticeId += 1;
    id;
  };

  public query func getNotice(id : Nat) : async ?Notice {
    notices.get(id);
  };

  public query func getAllNotices() : async [Notice] {
    notices.values().toArray();
  };

  public query func getNoticesByCategory(category : Text) : async [Notice] {
    notices.values().toArray().filter(func(n) { n.category == category });
  };

  public func addNoticeManual(
    title : Text, description : Text, postedDate : Text,
    attachment : ?Storage.ExternalBlob, attachmentName : ?Text,
    category : Text, createdBy : Text,
  ) : async Nat {
    let id = noticeId;
    notices.add(id, { id; title; description; postedDate; attachment; attachmentName; category; createdBy });
    noticeId += 1;
    id;
  };

};
