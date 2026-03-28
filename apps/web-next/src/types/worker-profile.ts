export interface TradeSkill {
  tradeId: number
  years: number
}

export interface Trade {
  id: number
  code: string
  nameKo: string
  nameVi: string
}

export interface ProfileDraft {
  // Step 1: Basic info
  fullName: string
  dateOfBirth: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | ''
  bio: string
  // Step 2: Experience
  primaryTradeId: number | null
  experienceMonths: number
  tradeSkills: TradeSkill[]
  // Step 3: Address
  currentProvince: string
  currentDistrict: string
  addressLabel: string  // human-readable address from Google Maps
  lat: number | null
  lng: number | null
  // Step 4: ID Documents (managed separately via upload)
  idNumber: string
  idFrontUrl: string | null
  idBackUrl: string | null
  idVerified: boolean
  // Step 5: Signature (managed separately via upload)
  signatureUrl: string | null
  // Step 6: Bank account
  bankName: string
  bankAccountNumber: string
  // Step 7: Terms
  termsAccepted: boolean
  privacyAccepted: boolean
  // Meta
  profileComplete: boolean
}

export const EMPTY_DRAFT: ProfileDraft = {
  fullName: '', dateOfBirth: '', gender: '', bio: '',
  primaryTradeId: null, experienceMonths: 0, tradeSkills: [],
  currentProvince: '', currentDistrict: '', addressLabel: '', lat: null, lng: null,
  idNumber: '', idFrontUrl: null, idBackUrl: null, idVerified: false,
  signatureUrl: null,
  bankName: '', bankAccountNumber: '',
  termsAccepted: false, privacyAccepted: false,
  profileComplete: false,
}
