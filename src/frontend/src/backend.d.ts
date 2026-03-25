import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Expense {
    id: bigint;
    date: string;
    description: string;
    category: string;
    amount: bigint;
}
export interface DebitEntry {
    id: bigint;
    flatId: bigint;
    date: string;
    description: string;
    amount: bigint;
}
export interface FlatOwner {
    id: bigint;
    ownerName: string;
    password: string;
    flatStatus: string;
    block: string;
    ownerMobile: string;
    flatNumber: string;
    maintenanceAmount: bigint;
    openingBalance: bigint;
}
export interface Notice {
    id: bigint;
    title: string;
    postedDate: string;
    createdBy: string;
    description: string;
    category: string;
    attachmentName?: string;
    attachment?: ExternalBlob;
}
export interface Payment {
    id: bigint;
    flatId: bigint;
    date: string;
    paymentMode: string;
    receiptId: string;
    amount: bigint;
}
export interface SocietyProfile {
    name: string;
    address: string;
    licenseNumber: string;
    voucherCategories: Array<string>;
}
export interface UserProfile {
    flatId?: bigint;
    name: string;
    mobile: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addDebitEntry(debitEntry: DebitEntry): Promise<bigint>;
    addExpense(expense: Expense): Promise<bigint>;
    addFlatOwner(flatOwner: FlatOwner): Promise<bigint>;
    addNotice(notice: Notice): Promise<bigint>;
    addNoticeManual(title: string, description: string, postedDate: string, attachment: ExternalBlob | null, attachmentName: string | null, category: string, createdBy: string): Promise<bigint>;
    addPayment(payment: Payment): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteFlatOwner(id: bigint): Promise<void>;
    generateMonthlyDebit(description: string, date: string): Promise<void>;
    getAllDebitEntries(): Promise<Array<DebitEntry>>;
    getAllExpenses(): Promise<Array<Expense>>;
    getAllFlatOwners(): Promise<Array<FlatOwner>>;
    getAllNotices(): Promise<Array<Notice>>;
    getAllPayments(): Promise<Array<Payment>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDebitEntry(id: bigint): Promise<DebitEntry | null>;
    getExpense(id: bigint): Promise<Expense | null>;
    getFlatOwner(id: bigint): Promise<FlatOwner | null>;
    getFlatStatement(flatId: bigint): Promise<{
        credits: Array<Payment>;
        debits: Array<DebitEntry>;
        openingBalance: bigint;
    }>;
    getNotice(id: bigint): Promise<Notice | null>;
    getNoticesByCategory(category: string): Promise<Array<Notice>>;
    getPayment(id: bigint): Promise<Payment | null>;
    getPendingAmount(flatId: bigint): Promise<bigint>;
    getPendingFlats(): Promise<Array<{
        id: bigint;
        ownerName: string;
        password: string;
        flatStatus: string;
        block: string;
        pendingAmount: bigint;
        ownerMobile: string;
        flatNumber: string;
        maintenanceAmount: bigint;
        openingBalance: bigint;
    }>>;
    getSocietyProfile(): Promise<SocietyProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    resetFinancialData(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateFlatOwner(flatOwner: FlatOwner): Promise<void>;
    updateSocietyProfile(profile: SocietyProfile): Promise<void>;
}
