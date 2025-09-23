export interface PageEntry { path: string; cloned: boolean }
export interface Manifest { baseUrl: string; landingPath: string; pages: PageEntry[] }

export const manifest: Manifest = {
  baseUrl: '',
  landingPath: '/',
  pages: []
}