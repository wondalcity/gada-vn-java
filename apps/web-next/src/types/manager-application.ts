export type BusinessType = 'INDIVIDUAL' | 'CORPORATE'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ManagerDraft {
  // Step 1
  businessType: BusinessType | ''
  // Step 2
  companyName: string
  businessRegNumber: string
  businessRegDoc: File | null
  businessRegDocUrl: string | null   // existing URL from API
  // Step 3
  representativeName: string
  representativeDob: string
  representativeGender: 'MALE' | 'FEMALE' | 'OTHER' | ''
  contactPhone: string
  // Step 4
  firstSiteName: string
  firstSiteAddress: string
  contactAddress: string
  province: string
  // Step 5
  signatureDataUrl: string | null    // base64 PNG from canvas
  signatureUrl: string | null        // existing URL from API
  // Step 6
  termsAccepted: boolean
  privacyAccepted: boolean
}

export const EMPTY_DRAFT: ManagerDraft = {
  businessType: '', companyName: '', businessRegNumber: '',
  businessRegDoc: null, businessRegDocUrl: null,
  representativeName: '', representativeDob: '', representativeGender: '', contactPhone: '',
  firstSiteName: '', firstSiteAddress: '', contactAddress: '', province: '',
  signatureDataUrl: null, signatureUrl: null,
  termsAccepted: false, privacyAccepted: false,
}

export interface ManagerRegistrationStatus {
  hasApplied: boolean
  approvalStatus: ApprovalStatus | null
  submittedAt: string | null
  rejectionReason: string | null
  profile: {
    businessType: BusinessType | null
    companyName: string | null
    representativeName: string | null
    representativeDob: string | null
    representativeGender: 'MALE' | 'FEMALE' | 'OTHER' | null
    businessRegNumber: string | null
    businessRegDocUrl: string | null
    contactPhone: string | null
    contactAddress: string | null
    province: string | null
    firstSiteName: string | null
    firstSiteAddress: string | null
    signatureUrl: string | null
    termsAccepted: boolean
    privacyAccepted: boolean
  } | null
}
