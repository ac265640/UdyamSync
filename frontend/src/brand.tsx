import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Brand = 'accel' | 'airtel'
const Ctx = createContext<{ brand: Brand; setBrand: (b: Brand) => void; name: string }>({ brand: 'accel', setBrand: () => {}, name: 'Accel Business' })

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>(() => (localStorage.getItem('brand') as Brand) || 'accel')
  useEffect(() => {
    document.documentElement.dataset.theme = brand
    localStorage.setItem('brand', brand)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', brand === 'airtel' ? '#E40000' : '#0F5E6E')
  }, [brand])
  return <Ctx.Provider value={{ brand, setBrand, name: brand === 'airtel' ? 'Airtel Business' : 'Accel Business' }}>{children}</Ctx.Provider>
}

export const useBrand = () => useContext(Ctx)
