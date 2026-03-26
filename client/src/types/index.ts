export type Role = 0 | 1

export type AuthUser = {
  id: string
  fullName: string
  email: string
  role: Role
}

export type AdminAccount = {
  id: string
  fullName: string
  email: string
  role: Role
  createdAt: string
  updatedAt: string
}

export type YouthFormInput = {
  fullName: string
  middleName: string
  gender: 'Male' | 'Female' | 'Other' | ''
  age: string
  birthdate: string
  registrationDate: string
  contactNumber: string
  address: string
  guardianContact: string
  emergencyContactPerson: string
  emergencyContactNumber: string
  photoData: string
  photoName: string
}

export type SubmissionStatus = 'Pending' | 'Approved'

export type Submission = {
  id: string
  userId: string
  fullName: string
  middleName: string
  gender: 'Male' | 'Female' | 'Other'
  age: number
  birthdate: string
  registrationDate: string
  contactNumber: string
  address: string
  guardianContact: string
  emergencyContactPerson: string
  emergencyContactNumber: string
  photoData: string
  photoName: string
  status: SubmissionStatus
  createdAt: string
  updatedAt: string
}

export type ActivityStatus = 'Draft' | 'Published' | 'Archived'

export type Activity = {
  id: string
  title: string
  details: string
  eventDate: string
  location: string
  status: ActivityStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type AdminAuditLog = {
  id: string
  adminId: string
  action: string
  entityType: string
  entityId: string
  summary: string
  createdAt: string
  updatedAt: string
}
