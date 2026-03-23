import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { YouthFormInput } from '../types'

type FormProps = {
  loading: boolean
  onSubmit: (input: YouthFormInput) => Promise<void>
}

const required: Array<keyof YouthFormInput> = [
  'fullName',
  'middleName',
  'gender',
  'age',
  'birthdate',
  'registrationDate',
  'contactNumber',
  'address',
  'guardianContact',
  'emergencyContactPerson',
  'emergencyContactNumber',
  'photoData',
]

const phoneFields: Array<keyof YouthFormInput> = [
  'contactNumber',
  'guardianContact',
  'emergencyContactNumber',
]

const makeEmpty = (): YouthFormInput => ({
  fullName: '',
  middleName: '',
  gender: '',
  age: '',
  birthdate: '',
  registrationDate: new Date().toISOString().slice(0, 10),
  contactNumber: '',
  address: '',
  guardianContact: '',
  emergencyContactPerson: '',
  emergencyContactNumber: '',
  photoData: '',
  photoName: '',
})

export function Form({ loading, onSubmit }: FormProps) {
  const [formData, setFormData] = useState<YouthFormInput>(() => makeEmpty())
  const [photoPreview, setPhotoPreview] = useState('')
  const [errors, setErrors] = useState<Record<keyof YouthFormInput, boolean>>({
    fullName: false,
    middleName: false,
    gender: false,
    age: false,
    birthdate: false,
    registrationDate: false,
    contactNumber: false,
    address: false,
    guardianContact: false,
    emergencyContactPerson: false,
    emergencyContactNumber: false,
    photoData: false,
    photoName: false,
  })

  const progress = useMemo(() => {
    const completed = required.filter((key) => formData[key].trim()).length
    if (completed > 6) return 2
    if (completed > 2) return 1
    return 0
  }, [formData])

  const formatPhoneNumber = (raw: string) => {
    let digits = raw.replace(/\D/g, '')
    if (digits.startsWith('63')) digits = digits.slice(2)
    if (digits.startsWith('0')) digits = digits.slice(1)
    digits = digits.slice(0, 10)
    if (!digits) return ''
    if (digits.length <= 3) return `+63 ${digits}`
    if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  const onChange = (name: keyof YouthFormInput, value: string) => {
    const nextValue = phoneFields.includes(name) ? formatPhoneNumber(value) : value
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
    setErrors((prev) => ({ ...prev, [name]: false }))
  }

  const fieldErrorMessage = (field: keyof YouthFormInput) => {
    if (!errors[field]) return ''
    if (field === 'age') return 'Age must be between 10 and 35.'
    if (phoneFields.includes(field)) return 'Use a valid number format (+63 9XX XXX XXXX).'
    if (field === 'photoData') return 'Please upload your profile photo.'
    return 'This field is required.'
  }

  const onFile = (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be below 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const encoded = typeof reader.result === 'string' ? reader.result : ''
      setPhotoPreview(encoded)
      setFormData((prev) => ({
        ...prev,
        photoData: encoded,
        photoName: file.name,
      }))
      setErrors((prev) => ({ ...prev, photoData: false }))
    }
    reader.readAsDataURL(file)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = { ...errors }
    let bad = false

    required.forEach((field) => {
      if (!formData[field].trim()) {
        nextErrors[field] = true
        bad = true
      }
    })

    const age = Number(formData.age)
    if (!Number.isFinite(age) || age < 10 || age > 35) {
      nextErrors.age = true
      bad = true
    }

    for (const phoneField of phoneFields) {
      const digits = formData[phoneField].replace(/\D/g, '')
      if (digits.length !== 12 || !digits.startsWith('63')) {
        nextErrors[phoneField] = true
        bad = true
      }
    }

    if (bad) {
      setErrors(nextErrors)
      return
    }

    await onSubmit(formData)
    setFormData(makeEmpty())
    setPhotoPreview('')
  }

  return (
    <div className="card form-card">
      <div className="card-accent"></div>
      <div className="form-title">Youth Information Form</div>
      <div className="form-desc">
        Fill in all required fields with accurate information.
        <br />
        This will be part of your official youth ministry record.
      </div>

      <div className="progress">
        {[0, 1, 2].map((segment) => (
          <div key={segment} className={`pdot ${segment <= progress ? 'active' : ''}`}></div>
        ))}
      </div>

      <form className="stack" onSubmit={submit} noValidate>
        <div className="sec-head">
          <div className="sec-line"></div>
          <div className="sec-badge">👤 Personal Info</div>
          <div className="sec-line r"></div>
        </div>

        <InputField
          label="Full Name"
          icon="🪪"
          name="fullName"
          value={formData.fullName}
          placeholder="Last Name, First Name"
          onChange={onChange}
          error={errors.fullName}
          errorMessage={fieldErrorMessage('fullName')}
        />

        <InputField
          label="Middle Name"
          icon="🧾"
          name="middleName"
          value={formData.middleName}
          placeholder="Your middle name"
          onChange={onChange}
          error={errors.middleName}
          errorMessage={fieldErrorMessage('middleName')}
        />

        <div className="grid-2">
          <SelectField
            label="Gender"
            icon="⚧"
            name="gender"
            value={formData.gender}
            onChange={onChange}
            error={errors.gender}
            errorMessage={fieldErrorMessage('gender')}
            options={[
              { value: '', label: 'Select gender' },
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <InputField
            label="Age"
            icon="🎂"
            name="age"
            value={formData.age}
            type="number"
            placeholder="e.g. 17"
            onChange={onChange}
            error={errors.age}
            errorMessage={fieldErrorMessage('age')}
            min={10}
            max={35}
          />
          <InputField
            label="Birthdate"
            icon="📅"
            name="birthdate"
            value={formData.birthdate}
            type="date"
            onChange={onChange}
            error={errors.birthdate}
            errorMessage={fieldErrorMessage('birthdate')}
          />
        </div>

        <InputField
          label="Date"
          icon="📆"
          name="registrationDate"
          value={formData.registrationDate}
          type="date"
          onChange={onChange}
          error={errors.registrationDate}
          errorMessage={fieldErrorMessage('registrationDate')}
        />

        <InputField
          label="Address"
          icon="📍"
          name="address"
          value={formData.address}
          placeholder="House No., Street, Barangay, City"
          onChange={onChange}
          error={errors.address}
          errorMessage={fieldErrorMessage('address')}
        />

        <InputField
          label="Contact Number"
          icon="📱"
          name="contactNumber"
          value={formData.contactNumber}
          type="tel"
          placeholder="+63 9XX XXX XXXX"
          onChange={onChange}
          error={errors.contactNumber}
          errorMessage={fieldErrorMessage('contactNumber')}
        />

        <div className="sec-head">
          <div className="sec-line"></div>
          <div className="sec-badge">🚨 Emergency Contact</div>
          <div className="sec-line r"></div>
        </div>

        <InputField
          label="Parents / Guardian Number"
          icon="👨‍👩‍👧"
          name="guardianContact"
          value={formData.guardianContact}
          type="tel"
          placeholder="+63 9XX XXX XXXX"
          onChange={onChange}
          error={errors.guardianContact}
          errorMessage={fieldErrorMessage('guardianContact')}
        />

        <InputField
          label="Emergency Contact Person"
          icon="🆘"
          name="emergencyContactPerson"
          value={formData.emergencyContactPerson}
          placeholder="Full name"
          onChange={onChange}
          error={errors.emergencyContactPerson}
          errorMessage={fieldErrorMessage('emergencyContactPerson')}
        />

        <InputField
          label="Emergency Contact Number"
          icon="📞"
          name="emergencyContactNumber"
          value={formData.emergencyContactNumber}
          type="tel"
          placeholder="+63 9XX XXX XXXX"
          onChange={onChange}
          error={errors.emergencyContactNumber}
          errorMessage={fieldErrorMessage('emergencyContactNumber')}
        />

        <div className="sec-head">
          <div className="sec-line"></div>
          <div className="sec-badge">📷 Profile Photo</div>
          <div className="sec-line r"></div>
        </div>

        <label className={`photo-box ${formData.photoData ? 'photo-loaded' : ''}`}>
          <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="avatar-shell">
            <div className="avatar-inner">
              {photoPreview ? <img src={photoPreview} alt="Preview" /> : <span>🙂</span>}
            </div>
          </div>
          <div className="photo-main">
            {photoPreview ? '✓ Photo uploaded!' : 'Tap here to upload your photo'}
          </div>
          <div className="photo-note">
            Please use a clear, decent, and recent photo.
            <br />
            This will appear on your youth activity profile.
          </div>
          <div className="type-row">
            <span className="type-tag">JPG</span>
            <span className="type-tag">PNG</span>
            <span className="type-tag">WEBP</span>
            <span className="type-tag">Max 5MB</span>
          </div>
        </label>
        {errors.photoData && <div className="field-error">{fieldErrorMessage('photoData')}</div>}

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Submitting...' : '✦ Submit Registration ✦'}
        </button>

        <p className="foot-note">
          By submitting this form, you agree that your information will be used exclusively for
          <strong> St. Joseph the Worker Chapel</strong> youth ministry activities.
        </p>
      </form>
    </div>
  )
}

type InputFieldProps = {
  label: string
  icon: string
  name: keyof YouthFormInput
  value: string
  type?: 'text' | 'number' | 'date' | 'tel'
  placeholder?: string
  min?: number
  max?: number
  error: boolean
  errorMessage?: string
  onChange: (name: keyof YouthFormInput, value: string) => void
}

function InputField({
  label,
  icon,
  name,
  value,
  type = 'text',
  placeholder,
  min,
  max,
  error,
  errorMessage,
  onChange,
}: InputFieldProps) {
  return (
    <div className="field">
      <label className="lbl" htmlFor={name}>
        {label} <span className="req">*</span>
      </label>
      <div className="inp-wrap">
        <span className="inp-ico" aria-hidden="true">
          {icon}
        </span>
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          min={min}
          max={max}
          className={error ? 'err' : ''}
          placeholder={placeholder}
          onChange={(event) => onChange(name, event.target.value)}
        />
      </div>
      {errorMessage ? <div className="field-error">{errorMessage}</div> : null}
    </div>
  )
}

type SelectFieldProps = {
  label: string
  icon: string
  name: keyof YouthFormInput
  value: string
  error: boolean
  errorMessage?: string
  options: Array<{ value: string; label: string }>
  onChange: (name: keyof YouthFormInput, value: string) => void
}

function SelectField({
  label,
  icon,
  name,
  value,
  error,
  errorMessage,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <div className="field">
      <label className="lbl" htmlFor={name}>
        {label} <span className="req">*</span>
      </label>
      <div className="inp-wrap">
        <span className="inp-ico" aria-hidden="true">
          {icon}
        </span>
        <select
          id={name}
          name={name}
          value={value}
          className={error ? 'err' : ''}
          onChange={(event) => onChange(name, event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {errorMessage ? <div className="field-error">{errorMessage}</div> : null}
    </div>
  )
}
