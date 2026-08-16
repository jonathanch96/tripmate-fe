export type TripSettings={editPermission:"everyone"|"own_only";approvalRequiredExpenses:boolean;approvalRequiredSettlements:boolean;multiCurrencyEnabled:boolean;allowSettlementBeforeEnd:boolean}
export type Trip={id:string;code:string;name:string;baseCurrency:string;startDate:string;endDate:string;plannerId:string;isFinalized:boolean;settings:TripSettings;version:number;canEditSettings:boolean;currencies?:string[]}
export type Participant={id:string;tripId:string;userId:string;role:"planner"|"participant";bankInfo:{bankName:string;accountNumber:string;accountHolder:string}|null;displayName:string|null;user?:{id:string;name:string;email:string;hasAccount:boolean}}
export type Invitation={id:string;tripId:string;email:string;token:string;status:string;expiresAt:string}
