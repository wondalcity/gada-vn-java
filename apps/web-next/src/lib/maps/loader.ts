import { Loader } from '@googlemaps/js-api-loader'

let loaderInstance: Loader | null = null

export function getGoogleMapsLoader(language = 'ko'): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      version: 'weekly',
      libraries: ['places'],
      language,
      region: 'VN',
    })
  }
  return loaderInstance
}
