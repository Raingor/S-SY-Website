// Synthetic records only: regression services must never clone live/local data.
export function syntheticContentFixture() {
  const fixture = Object.fromEntries(['routes', 'destinations', 'leads', 'sampleItineraries', 'customTrips', 'destinationCategories', 'destinationTypes', 'miniprogramOrders', 'miniprogramUsers', 'homeBanners', 'miniprogramServiceEntries', 'heritageGuideBanners', 'audioRoutes', 'audioTracks', 'audioAlbums'].map(key => [key, []]))
  return {
    ...fixture,
    attractionDetailPage: {},
    settings: { siteName: 'Synthetic fixture', siteUrl: 'https://fixture.invalid' },
    countries: [{ id: 'greece', name: 'Fixture country', enabled: true }],
    guides: [],
    cities: ['athens', 'delphi'].map(id => ({ id, name: `Fixture ${id}`, countryId: 'greece', status: 'published', enabled: true })),
    attractions: Array.from({ length: 15 }, (_, index) => ({
      id: index === 0 ? 'acropolis' : index === 1 ? 'delphi' : `fixture-attraction-${index}`,
      name: `Fixture attraction ${index}`, summary: 'Synthetic summary',
      countryId: 'greece', city: index === 1 ? 'delphi' : 'athens', status: 'published',
      guide: { faq: 'Synthetic FAQ', hours: 'Synthetic hours' },
      exhibits: [{ id: `fixture-point-${index}`, name: 'Synthetic point', status: 'published' }],
      highlights: [{ id: `fixture-highlight-${index}`, name: 'Synthetic highlight', desc: 'Synthetic description' }],
    })),
  }
}
