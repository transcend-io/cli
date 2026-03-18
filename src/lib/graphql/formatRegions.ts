import {
  IsoCountrySubdivisionCode,
  IsoCountryCode,
} from '@transcend-io/privacy-types';
import type { RegionInput } from '../../codecs';

// Country subdivision is nullable in DB
export interface Region {
  /** Country */
  country: IsoCountryCode;
  /** Sub division (may be null in DB) */
  countrySubDivision?: IsoCountrySubdivisionCode | null;
}

/**
 * Format regions list to remove null country subdivisions
 *
 * @param vals - Regions
 * @returns formatted regions
 */
export function formatRegions(vals: Region[]): RegionInput[] {
  return vals.map(({ country, countrySubDivision }) => ({
    country,
    ...(countrySubDivision ? { countrySubDivision } : {}),
  }));
}
