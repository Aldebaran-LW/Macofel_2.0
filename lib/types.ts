// Types for MACOFEL E-commerce

export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

// Product types
export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  stock: number
  imageUrl: string | null
  categoryId: string
  featured: boolean
  createdAt: Date
  updatedAt: Date
}

// Category types
export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

// Order types
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED'

export type { UserRole, AppPermission } from './permissions'